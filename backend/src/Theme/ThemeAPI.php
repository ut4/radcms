<?php

namespace RadCms\Theme;

use RadCms\BaseAPI;

class ThemeAPI extends BaseAPI {
    /**
     * Rekisteröi <script src="<?= $url ?>" ...> sisällytettäväksi sivutemplaatin
     * <?= $this->jsFiles() ?> outputtiin. Esimerkki: enqueueJsFile('my-file.js',
     * ['type' => 'module']);
     *
     * @param string $url
     * @param array $attrs = array
     */
    public function enqueueJsFile($url, array $attrs = []) {
        $this->configsStorage->putJsFile((object)[
            'url' => $url,
            'attrs' => $attrs,
        ], BaseAPI::TARGET_WEBSITE_LAYOUT);
    }
    /**
     * Rekisteröi <link href="<?= $url ?>" ...> sisällytettäväksi sivutemplaatin
     * <?= $this->cssFiles() ?> outputtiin. Esimerkki: enqueueCssFile('my-file.css',
     * ['media' => 'screen']);
     *
     * @param string $url
     * @param array $attrs = array
     */
    public function enqueueCssFile($url, array $attrs = []) {
        $this->configsStorage->putCssFile((object)[
            'url' => $url,
            'attrs' => $attrs,
        ], BaseAPI::TARGET_WEBSITE_LAYOUT);
    }
}
