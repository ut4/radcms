<?php

declare(strict_types=1);

namespace RadCms\Content;

use RadCms\ContentType\ContentTypeDef;
use RadCms\Templating\StockFrontendPanelImpls;

/**
 * Luokka jonka templaattien <?php $this->fetchOne|All() ?> instansoi ja
 * palauttaa. Ei tarkoitettu käytettäväksi manuaalisesti.
 */
class MagicTemplateQuery extends Query {
    /** @var object */
    private $frontendPanels;
    /** @var \Closure[] */
    private $frontendPanelForEachFns;
    /** @var object[] */
    private $fetchedContent;
    /**
     * $param \RadCms\ContentType\ContentTypeDef $contentType
     * $param string $contentTypeAlias
     * $param string[] $fields
     * $param bool $isFetchOne
     * $param \RadCms\Content\DAO $dao
     */
    public function __construct(ContentTypeDef $contentType,
                                string $contentTypeAlias,
                                array $fields,
                                bool $isFetchOne,
                                DAO $dao) {
        parent::__construct($contentType, $contentTypeAlias, $fields, $isFetchOne, $dao);
        $this->frontendPanels = [];
        $this->frontendPanelForEachFns = [];
        $this->fetchedContent = [];
    }
    /**
     * @param array|object $settings {impl?: 'DefaultSingle'|'DefaultCollection'|'NameOfMyImpl', implProps?: array|object, formImpl?: 'Default'|'NameOfMyFormImpl', formImplProps?: array|object, title?: string, subtitle?: string, highlight: string}
     * @return $this
     */
    public function addFrontendPanel($settings): MagicTemplateQuery {
        $this->frontendPanels[] = $this->makeFrontendPanel($settings);
        return $this;
    }
    /**
     * @param \Closure $fn fn(object $contentNode, int $i): array|object
     * @param object|array|null $fallback = null Content panel settings, when query returns no results
     * @return $this
     */
    public function addFrontendPanelForEach(\Closure $fn, $fallback = null): MagicTemplateQuery {
        $this->frontendPanelForEachFns[] = [$fn, $fallback];
        return $this;
    }
    /**
     * @return bool
     */
    public function hasFrontendPanels(): bool {
        return $this->frontendPanels || $this->frontendPanelForEachFns;
    }
    /**
     * @return \stdClass[]
     */
    public function getFrontendPanels(): array {
        $out = $this->frontendPanels;
        foreach ($out as $def) $def->contentNodes = $this->fetchedContent;
        //
        foreach ($this->frontendPanelForEachFns as [$fn, $fallback]) {
            if ($this->fetchedContent) {
                foreach ($this->fetchedContent as $i => $cnode) {
                    $def = $this->makeFrontendPanel($fn($cnode, $i));
                    $def->contentNodes = [$cnode];
                    $out[] = $def;
                }
                continue;
            }
            $def = $this->makeFrontendPanel($fallback ?? new \stdClass);
            $def->contentNodes = [];
            $out[] = $def;
        }
        //
        foreach ($out as $i => $def)
            $def->queryInfo->where = $this->whereDef ?? null;
        //
        return $out;
    }
    /**
     * @param string $limitExpr
     * @return $this
     */
    public function limitExpr(string $limitExpr): MagicTemplateQuery {
        $this->limitExpr = $limitExpr;
        return $this;
    }
    /**
     * @return array|\stdClass|null
     */
    public function exec() {
        if (!$this->whereDef)
            $this->where('`status` < ?', DAO::STATUS_DELETED);
        else {
            $this->whereDef->expr .= ' AND `status` < ?';
            $this->whereDef->bindVals[] = DAO::STATUS_DELETED;
        }
        $bindVals = $this->whereDef->bindVals;
        foreach ($this->joinDefs as $d)
            if ($d->bindVals) $bindVals = array_merge($bindVals, $d->bindVals);
        //
        return $this->dao->doExec($this->toSql(), $this->isFetchOne,
                                  $bindVals ?? null, $this->joinDefs,
                                  $this->orderDef ? $this->orderDef->dir : null,
                                  function ($d) { $this->fetchedContent = $d; });
    }
    /**
     * @param \stdClass|array $settings
     * @return \stdClass
     */
    private function makeFrontendPanel($settings): \stdClass {
        if (!is_object($settings))
            $settings = (object) $settings;
        if (!isset($settings->impl))
            $settings->impl = StockFrontendPanelImpls::DEFAULT_SINGLE;
        return (object) [
            // config
            'impl' => $settings->impl,
            'implProps' => (object) ($settings->implProps ?? new \stdClass),
            'formImpl' => $settings->formImpl ?? 'Default',
            'formImplProps' => (object) ($settings->formImplProps ?? new \stdClass),
            'title' => $settings->title ?? $this->contentType->name,
            'subtitle' => $settings->subtitle ?? null,
            'highlightSelector' => $settings->highlight ?? null,
            // data
            'contentTypeName' => $this->contentType->name,
            'contentNodes' => null,
            'queryInfo' => (object) ['where' => null],
        ];
    }
}
