<?php

declare(strict_types=1);

namespace RadCms\Theme;

use RadCms\BaseAPI;

class ThemeAPI extends BaseAPI {
    /**
     * Rekisteröi kaikki sivut joiden url mätchää $urlPatterniin rende-
     * röitäväksi sivutemplaatilla $layoutFilePath. Esim. konfiguraatiolla:
     * ```
     * registerLayoutForUrlPattern('layout.a.tmpl.php', '/foo/.*');
     * registerLayoutForUrlPattern('layout.b.tmpl.php', '.*');
     * ```
     * Url '/foo/bar/' ja '/foo/a/b' renderöidään layoutilla RAD_WORKSPACE_PATH .\
     * "site/layout.a.tmpl.php", mutta 'bar' ja 'mita-tahansa-muuta' layoutilla
     * RAD_WORKSPACE_PATH . "site/layout.b.tmpl.php".
     *
     * @param string $layoutFilePath
     * @param string $urlPattern
     */
    public function registerLayoutForUrlPattern(string $layoutFilePath,
                                                string $urlPattern): void {
        $this->configsStorage->putUrlLayout($urlPattern, $layoutFilePath);
    }
    /**
     * Rekisteröi <script src="<?= $url ?>" ...> sisällytettäväksi sivutemplaatin
     * <?= $this->jsFiles() ?> outputtiin. Esimerkki: enqueueJsFile('my-file.js',
     * ['type' => 'module']);
     *
     * @param string $url
     * @param array $attrs = array
     */
    public function enqueueJsFile(string $url, array $attrs = []): void {
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
    public function enqueueCssFile(string $url, array $attrs = []): void {
        $this->configsStorage->putCssFile((object)[
            'url' => $url,
            'attrs' => $attrs,
        ], BaseAPI::TARGET_WEBSITE_LAYOUT);
    }
}
