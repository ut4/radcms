<?php

declare(strict_types=1);

namespace RadCms\Content;

use RadCms\ContentType\ContentTypeDef;

/**
 * Luokka jonka templaattien <?php $this->fetchOne|All() ?> instansoi ja
 * palauttaa. Ei tarkoitettu käytettäväksi manuaalisesti.
 */
class MagicTemplateQuery extends Query {
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
     * @param string $panelType
     * @param string $title = ''
     * @param string $highlightSelector = ''
     * @param string $subTitle = ''
     * @return $this
     */
    public function addFrontendPanel(string $panelType,
                                     string $title = '',
                                     string $highlightSelector = '',
                                     string $subTitle = ''): MagicTemplateQuery {
        $this->frontendPanels[] = (object) [
            'impl' => $panelType,
            'title' => $title ? $title : $this->contentType->name,
            'subTitle' => $subTitle ?? null,
            'contentTypeName' => $this->contentType->name,
            'contentNodes' => null,
            'queryInfo' => (object) ['where' => null],
            'highlightSelector' => $highlightSelector,
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
                                  $this->frontendPanels);
    }
}
