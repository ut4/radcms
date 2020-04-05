<?php

declare(strict_types=1);

namespace RadCms\Content;

/**
 * Luokka jonka templaattien <?php $this->fetchOne|All() ?> instansoi ja
 * palauttaa. Ei tarkoitettu käytettäväksi manuaalisesti.
 */
class MagicTemplateQuery extends Query {
    private $frontendPanelInfo;
    /**
     * @param string $panelType
     * @param string $title = ''
     * @param string $highlightSelector = ''
     * @param string $subTitle = ''
     * @return $this
     */
    public function createFrontendPanel(string $panelType,
                                        string $title = '',
                                        string $highlightSelector = '',
                                        string $subTitle = ''): MagicTemplateQuery {
        $this->frontendPanelInfo = (object) [
            'impl' => $panelType,
            'title' => $title ? $title : $this->contentType->name,
            'subTitle' => $subTitle ?? null,
            'contentTypeName' => $this->contentType->name,
            'contentNodes' => null,
            'queryInfo' => (object)['where' => null],
            'highlightSelector' => $highlightSelector,
        ];
        return $this;
    }
    /**
     * @return \stdClass|null
     */
    public function getFrontendPanelInfo(): ?\stdClass {
        if ($this->frontendPanelInfo && $this->whereDef)
            $this->frontendPanelInfo->queryInfo->where = $this->whereDef;
        return $this->frontendPanelInfo;
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
                                  $bindVals ?? null, $this->joinDefs[0] ?? null,
                                  $this->frontendPanelInfo);
    }
}
