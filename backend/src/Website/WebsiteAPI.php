<?php

declare(strict_types=1);

namespace RadCms\Website;

use RadCms\Theme\ThemeAPI;

/**
 * Site.php-tiedostojen oma api.
 */
class WebsiteAPI extends ThemeAPI {
    /**
     * Rekisteröi kaikki sivut joiden url mätchää $urlPatterniin rende-
     * röitäväksi sivutemplaatilla $layoutFilePath. Esim. konfiguraatiolla:
     * ```
     * registerLayoutForUrlPattern('layout.a.tmpl.php', '/foo/.*');
     * registerLayoutForUrlPattern('layout.b.tmpl.php', '.*');
     * ```
     * Url '/foo/bar/' ja '/foo/a/b' renderöidään layoutilla RAD_PUBLIC_PATH .\
     * "site/layout.a.tmpl.php", mutta 'bar' ja 'mita-tahansa-muuta' layoutilla
     * RAD_PUBLIC_PATH . "site/layout.b.tmpl.php".
     *
     * @param string $layoutFilePath
     * @param string $urlPattern
     */
    public function registerLayoutForUrlPattern($layoutFilePath, $urlPattern): void {
        $this->configsStorage->putUrlLayout($urlPattern, $layoutFilePath);
    }
}
