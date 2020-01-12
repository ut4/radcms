<?php

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
     * @return $this
     */
    public function createFrontendPanel($panelType,
                                        $title = '',
                                        $highlightSelector = '') {
        $this->frontendPanelInfo = (object)[
            'impl' => $panelType,
            'title' => $title ? $title : $this->contentType->name,
            'contentTypeName' => $this->contentType->name,
            'contentNodes' => null,
            'queryInfo' => (object)['where' => null],
            'highlightSelector' => $highlightSelector,
        ];
        return $this;
    }
    /**
     * @return object|null
     */
    public function getFrontendPanelInfo() {
        if ($this->frontendPanelInfo && $this->whereDef)
            $this->frontendPanelInfo->queryInfo->where = $this->whereDef;
        return $this->frontendPanelInfo;
    }
    /**
     * @return array|object|null
     */
    public function exec() {
        $bindVals = [];
        if ($this->whereDef && $this->whereDef->bindVals)
            $bindVals = array_merge($bindVals, $this->whereDef->bindVals);
        foreach ($this->joinDefs as $d)
            if ($d->bindVals) $bindVals = array_merge($bindVals, $d->bindVals);
        //
        return $this->dao->doExec($this->toSql(), $this->isFetchOne,
                                  $bindVals ?? null, $this->joinDefs[0] ?? null,
                                  $this->frontendPanelInfo);
    }
}
