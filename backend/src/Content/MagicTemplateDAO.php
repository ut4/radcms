<?php

declare(strict_types=1);

namespace RadCms\Content;

use Pike\ArrayUtils;
use Pike\Db;
use RadCms\ContentType\ContentTypeCollection;

class MagicTemplateDAO extends DAO {
    /** @var \RadCms\Content\MagicTemplateQuery[] */
    private $queries;
    /**
     * @param \Pike\Db $db
     * @param \RadCms\ContentType\ContentTypeCollection $contentTypes
     * @param bool $fetchDraft = true
     */
    public function __construct(Db $db,
                                ContentTypeCollection $contentTypes,
                                $fetchDraft = true) {
        parent::__construct($db, $contentTypes, $fetchDraft);
        $this->queries = [];
    }
    /**
     * @param string $contentTypeName
     * @return \RadCms\Content\MagicTemplateQuery
     */
    public function fetchOne(string $contentTypeName): MagicTemplateQuery {
        [$contentTypeName, $alias] = parent::parseContentTypeNameAndAlias($contentTypeName);
        // @allow \Pike\PikeException
        $type = $this->getContentType($contentTypeName);
        $this->queries[] = new MagicTemplateQuery($type, $alias, true, $this);
        return $this->queries[count($this->queries) - 1];
    }
    /**
     * @param string $contentTypeName eg. 'Article', 'Product', 'Movie', 'Employee'
     * @return \RadCms\Content\MagicTemplateQuery
     */
    public function fetchAll(string $contentTypeName): MagicTemplateQuery {
        [$contentTypeName, $alias] = parent::parseContentTypeNameAndAlias($contentTypeName);
        // @allow \Pike\PikeException
        $type = $this->getContentType($contentTypeName);
        $this->queries[] = new MagicTemplateQuery($type, $alias, false, $this);
        return $this->queries[count($this->queries) - 1];
    }
    /**
     * @return array array<{impl: string, title: string ...}>
     */
    public function getFrontendPanels(): array {
        $out = [];
        foreach ($this->queries as $q)
            $out = array_merge($out, $q->getFrontendPanels());
        return $out;
    }
    /**
     * @param string $sql
     * @param bool $isFetchOne
     * @param array $bindVals = null
     * @param \stdClass[] $joins = [] {contentTypeName: string, alias: string, expr: string, bindVals: array, isLeft: bool, collectFn: \Closure, targetFieldName: string|null}[]
     * @param string $orderDir = null
     * @param \Closure $receiveData = null fn(array<int, \stdClass|null> $fetchedContent): void
     * @return array<int, \stdClass>|\stdClass|null
     */
    public function doExec(string $sql,
                           bool $isFetchOne,
                           array $bindVals = null,
                           array $joins = [],
                           string $orderDir = null,
                           \Closure $receiveData = null) {
        $res = parent::doExec($sql, $isFetchOne, $bindVals, $joins, $orderDir);
        if ($isFetchOne) $normalized = $res ? [$res] : [];
        else $normalized = $res;
        $receiveData($normalized);
        if (!$res) return $res;
        //
        $out = [];
        if (!$this->fetchDraft) {
            $out = ArrayUtils::filterByKey($normalized, self::STATUS_PUBLISHED, 'status');
        } else {
            foreach ($normalized as $node) {
                if (!$node->currentDraft) { $out[] = $node; continue; }
                $draft = $node->currentDraft->snapshot;
                $draft->id = $node->id;
                $draft->contentType = $node->contentType;
                $draft->status = self::STATUS_PUBLISHED;
                $draft->isDraft = true;
                $out[] = $draft;
            }
        }
        return $isFetchOne ? $out[0] ?? null : $out;
    }
}
