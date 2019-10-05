<?php

namespace RadCms\Templating;

/**
 * Sisältää templaateissa käytettävät oletusfunktiot kuten
 * <?php $nodes = $this->fetchAll(...) ?> ja <?= $this->url('/slug') ?>.
 */
trait DefaultFunctions {
    /**
     * @param string $contentTypeName
     * @return RadCms\Content\DAO
     */
    private function fetchAll($contentTypeName) {
        return $this->__ctx['contentNodeDao']->fetchAll($contentTypeName);
    }
    /**
     * @param string $contentTypeName
     * @return RadCms\Content\DAO
     */
    private function fetchOne($contentTypeName) {
        return $this->__ctx['contentNodeDao']->fetchOne($contentTypeName);
    }
    /**
     * @param string $url
     * @return string
     */
    private function url($url) {
        return RAD_BASE_URL . ltrim($url, '/');
    }
}
