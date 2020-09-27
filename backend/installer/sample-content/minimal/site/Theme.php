<?php

declare(strict_types=1);

namespace RadSite;

use RadCms\Theme\ThemeAPI;
use RadCms\Theme\ThemeInterface;

class Theme implements ThemeInterface {
    /**
     * Ajetaan jokaisen sivupyynnön yhteydessä. Rekisteröi sivutemplaatit
     * ($api->registerLayoutForUrlPattern(<tiedostopolku>, <urlMatcheri>)) ja
     * tyylitiedostot ($api->enqueueCss|JsFile(<urli>)).
     *
     * @param \RadCms\Theme\ThemeAPI $api
     */
    public function init(ThemeAPI $api): void {
        $api->registerLayoutForUrlPattern('templates/layout.generic.tmpl.php', '.*');
        $api->enqueueCssFile('main.css');
    }
}
