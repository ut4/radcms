<?php

declare(strict_types=1);

namespace RadCms\Content;

use Pike\{ArrayUtils, Db, PikeException};
use RadCms\ContentType\{ContentTypeCollection, ContentTypeDef};

/**
 * Luokka jonka DAO->fetchOne|All() instansoi ja palauttaa. Ei tarkoitettu
 * käytettäväksi manuaalisesti.
 */
class DAO {
    public const STATUS_PUBLISHED = 0;
    public const STATUS_DRAFT = 1;
    public const STATUS_DELETED = 2;
    /** @var bool */
    public $fetchDraft;
    /** @var \Pike\Db */
    protected $db;
    /** @var \RadCms\ContentType\ContentTypeCollection */
    protected $contentTypes;
    /**
     * @param \Pike\Db $db
     * @param \RadCms\ContentType\ContentTypeCollection $contentTypes
     * @param bool $fetchDraft = false
     */
    public function __construct(Db $db,
                                ContentTypeCollection $contentTypes,
                                bool $fetchDraft = false) {
        $this->db = $db;
        $this->contentTypes = $contentTypes;
        $this->fetchDraft = $fetchDraft;
    }
    /**
     * @param string $contentTypeName
     * @return \RadCms\Content\Query
     */
    public function fetchOne(string $contentTypeName): Query {
        [$contentTypeName, $alias] = self::parseContentTypeNameAndAlias($contentTypeName);
        // @allow \Pike\PikeException
        $type = $this->getContentType($contentTypeName);
        return new Query($type, $alias, true, $this);
    }
    /**
     * @param string $contentTypeName eg. 'Article', 'Product', 'Movie', 'Employee'
     * @return \RadCms\Content\Query
     */
    public function fetchAll(string $contentTypeName): Query {
        [$contentTypeName, $alias] = self::parseContentTypeNameAndAlias($contentTypeName);
        // @allow \Pike\PikeException
        $type = $this->getContentType($contentTypeName);
        return new Query($type, $alias, false, $this);
    }
    /**
     * @param string $sql
     * @param bool $isFetchOne
     * @param array $bindVals = null
     * @param \stdClass[] $joins = [] {contentTypeName: string, alias: string, expr: string, bindVals: array, isLeft: bool, collectFn: \Closure, targetFieldName: string|null}[]
     * @param string $orderDir = null
     * @return \stdClass[]|\stdClass|null
     */
    public function doExec(string $sql,
                           bool $isFetchOne,
                           array $bindVals = null,
                           array $joins = [],
                           string $orderDir = null) {
        $out = null;
        // @allow \Pike\PikeException
        $rows = $this->db->fetchAll($sql, $bindVals, \PDO::FETCH_CLASS, '\stdClass');
        if ($isFetchOne) {
            $out = $rows ? $this->makeContentNode($rows[0], $rows) : null;
        } else {
            if ($this->fetchDraft || $joins) {
                if ($orderDir === Query::DIRECTION_DESC) $rows = array_reverse($rows);
                elseif ($orderDir === Query::DIRECTION_RAND) shuffle($rows);
            }
            $out = $rows ? array_map(function ($row) use ($rows) {
                return $this->makeContentNode($row, $rows);
            }, $rows) : [];
        }
        //
        if ($out && $joins) {
            foreach ($joins as $join)
                $out = $this->runUserDefinedJoinCollector($join,
				    $rows, $isFetchOne, $out);
		}
        //
        return $out;
    }
    /**
     * @return \RadCms\ContentType\ContentTypeDef
     * @throws \Pike\PikeException
     */
    public function getContentType(string $name): ContentTypeDef {
        if (!($type = ArrayUtils::findByKey($this->contentTypes, $name, 'name')))
            throw new PikeException("Content type `{$name}` not registered",
                                    PikeException::BAD_INPUT);
        return $type;
    }
    /**
     * @return \stdClass
     */
    private function makeContentNode(\stdClass $row, array $rows): \stdClass {
        $out = clone $row;
        unset($out->revisionSnapshot);
        unset($out->revisionCreatedAt);
        $out->status = (int) $out->status;
        $out->isDraft = false;
        $out->currentDraft = null;
        if (!$this->fetchDraft) return $out;
        //
        foreach ($rows as $row) {
            if (!$row->revisionSnapshot ||
                $row->id !== $row->id ||
                $row->contentType !== $row->contentType) continue;
            $out->currentDraft = (object) [
                'createdAt' => (int) $row->revisionCreatedAt,
                'snapshot' => json_decode($row->revisionSnapshot)
            ];
        }
        $out->isDraft = $out->currentDraft !== null;
        return $out;
    }
    private function runUserDefinedJoinCollector(\stdClass $join,
                                                 array $rows,
                                                 bool $isFetchOne,
                                                 $out) {
        if (!$join->collectFn)
            return $out;
        $nodes = $isFetchOne ? [$out] : $out;
        // one <-> one
        if (!$join->targetFieldName) {
            $fn = $join->collectFn;
            foreach ($nodes as $node) {
                foreach ($rows as $row)
                    $fn($node, $row);
            }
            return $out;
        }
        // one <-> many
        $joinIdKey = $join->alias . 'Id';
        $joinContentTypeNameKey = $join->alias . 'ContentType';
        $fn = $join->collectFn;
        $processed = [];
        foreach ($nodes as $node) {
            if (!array_key_exists($node->id, $processed)) {
                $node->{$join->targetFieldName} = [];
                foreach ($rows as $row) {
                    if (
                        $row->{$joinIdKey} &&
                        $row->id === $node->id &&
                        $row->{$joinContentTypeNameKey} === $join->contentTypeName
                    ) $fn($node, $row);
                }
                $processed[$node->id] = $node;
            }
        }
        return $isFetchOne ? reset($processed) : array_values($processed);
    }
    /**
     * 'Foo f' -> ['foo', 'f'] tai 'Foo' -> ['Foo', <defaultAlias>]
     *
     * @param string $expr
     * @param string $defaultAlias = '_a'
     */
    public static function parseContentTypeNameAndAlias(string $expr,
                                                        string $defaultAlias = '_a'): array {
        $pcs = explode(' ', $expr);
        return [$pcs[0], $pcs[1] ?? $defaultAlias];
    }
}
