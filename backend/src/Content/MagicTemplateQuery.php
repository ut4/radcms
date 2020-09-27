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
    /** @var object[] */
    private $frontendPanels;
    /**
     * $param \RadCms\ContentType\ContentTypeDef $contentType
     * $param string $contentTypeAlias
     * $param bool $isFetchOne
     * $param \RadCms\Content\DAO $dao
     */
    public function __construct(ContentTypeDef $contentType,
                                string $contentTypeAlias,
                                bool $isFetchOne,
                                DAO $dao) {
        parent::__construct($contentType, $contentTypeAlias, $isFetchOne, $dao);
        $this->frontendPanels = [];
    }
    /**
     * @param array|object $settings {impl?: 'DefaultSingle'|'DefaultCollection'|'NameOfMyImpl', implProps?: array|object, formImpl?: 'Default'|'NameOfMyFormImpl', formImplProps?: array|object, title?: string, subtitle?: string, highlight: string}
     * @return $this
     */
    public function addFrontendPanel($settings): MagicTemplateQuery {
        if (!is_object($settings))
            $settings = (object) $settings;
        if (!isset($settings->impl))
            $settings->impl = StockFrontendPanelImpls::DEFAULT_SINGLE;
        $this->frontendPanels[] = (object) [
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
        return $this;
    }
    /**
     * @return \stdClass[]
     */
    public function getFrontendPanels(): array {
        if ($this->whereDef) {
            foreach ($this->frontendPanels as $def)
                $def->queryInfo->where = $this->whereDef;
        }
        return $this->frontendPanels;
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
                                  $this->frontendPanels);
    }
}
