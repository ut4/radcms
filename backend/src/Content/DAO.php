<?php

namespace RadCms\Content;

use Pike\Db;
use RadCms\ContentType\ContentTypeCollection;
use Pike\PikeException;

/**
 * Luokka jonka DAO->fetchOne|All() instansoi ja palauttaa. Ei tarkoitettu
 * käytettäväksi manuaalisesti.
 */
class DAO {
    public $fetchRevisions;
    protected $db;
    protected $contentTypes;
    /**
     * @param \Pike\Db $db
     * @param \RadCms\ContentType\ContentTypeCollection $contentTypes
     * @param bool $fetchRevisions = false
     */
    public function __construct(Db $db,
                                ContentTypeCollection $contentTypes,
                                $fetchRevisions = false) {
        $this->db = $db;
        $this->contentTypes = $contentTypes;
        $this->fetchRevisions = $fetchRevisions;
    }
    /**
     * @param string $contentTypeName
     * @return \RadCms\Content\Query
     */
    public function fetchOne($contentTypeName) {
        [$contentTypeName, $alias] = self::parseContentTypeNameAndAlias($contentTypeName);
        // @allow \Pike\PikeException
        $type = $this->getContentType($contentTypeName);
        return new Query($type, $alias, true, $this);
    }
    /**
     * @param string $contentTypeName eg. 'Article', 'Product', 'Movie', 'Employee'
     * @return \RadCms\Content\Query
     */
    public function fetchAll($contentTypeName) {
        [$contentTypeName, $alias] = self::parseContentTypeNameAndAlias($contentTypeName);
        // @allow \Pike\PikeException
        $type = $this->getContentType($contentTypeName);
        return new Query($type, $alias, false, $this);
    }
    /**
     * @param string $sql
     * @param bool $isFetchOne
     * @param array $bindVals = null
     * @param \stdClass $join = null {contentType: string, alias: string, collector: [\Closure, string]}
     * @return array|\stdClass|null
     */
    public function doExec($sql,
                           $isFetchOne,
                           $bindVals = null,
                           $join = null) {
        $out = null;
        // @allow \PDOException
        $rows = $this->db->fetchAll($sql, $bindVals);
        if ($isFetchOne) {
            $out = $rows ? $this->makeContentNode($rows[0], $rows) : null;
        } else {
            $out = $rows ? array_map(function ($row) use ($rows) {
                return $this->makeContentNode($row, $rows);
            }, $rows) : [];
        }
        //
        if ($out && $join) {
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
    public function getContentType($name) {
        if (!($type = $this->contentTypes->find($name)))
            throw new PikeException("Content type `{$name}` not registered",
                                    PikeException::BAD_INPUT);
        return $type;
    }
    /**
     * @return \stdClass
     */
    private function makeContentNode($row, $rows) {
        $out = (object)$row;
        unset($out->revisionSnapshot);
        $out->isPublished = (bool)$out->isPublished;
        $out->isRevision = false;
        $out->revisions = [];
        if (!$this->fetchRevisions) return $out;
        //
        foreach ($rows as $row) {
            if (!$row['revisionSnapshot'] ||
                $row['id'] !== $out->id ||
                $row['contentType'] !== $out->contentType) continue;
            $out->revisions[] = (object)[
                'createdAt' => (int)$row['revisionCreatedAt'],
                'snapshot' => json_decode($row['revisionSnapshot'])
            ];
        }
        $out->isRevision = !empty($out->revisions);
        usort($out->revisions, function ($a, $b) {
            return $b->createdAt - $a->createdAt;
        });
        return $out;
    }
    private function runUserDefinedJoinCollector($join, $rows, $isFetchOne, &$out) {
        $joinContentTypeName = $join->contentType;
        $joinIdKey = $join->alias . 'Id';
        $joinContentTypeKey = $join->alias . 'ContentType';
        [$fn, $fieldName] = $join->collector;
        //
        $processed = [];
        foreach (($isFetchOne ? [$out] : $out) as $node) {
            if (!array_key_exists($node->id, $processed)) {
                $node->$fieldName = [];
                foreach ($rows as $row) {
                    if (
                        $row[$joinIdKey] &&
                        $row['id'] === $node->id &&
                        $row[$joinContentTypeKey] === $joinContentTypeName
                    ) $fn($node, $row);
                }
                $processed[$node->id] = $node;
            }
        }
        //
        return $isFetchOne ? reset($processed) : array_values($processed);
    }
    /**
     * 'Foo f' -> ['foo', 'f'] tai 'Foo' -> ['Foo', <defaultAlias>]
     *
     * @param string $expr
     * @param string $defaultAlias = 'a'
     */
    public static function parseContentTypeNameAndAlias($expr, $defaultAlias = 'a') {
        $pcs = explode(' ', $expr);
        return [$pcs[0], $pcs[1] ?? $defaultAlias];
    }
}
