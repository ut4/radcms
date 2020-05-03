<?php

declare(strict_types=1);

namespace RadSite;

use RadCms\Website\WebsiteAPI;
use RadCms\Website\WebsiteInterface;

class Site implements WebsiteInterface {
    /**
     * Rekisteröi sivutemplaatit ($api->registerLayoutForUrlPattern(<tiedostopolku>,
     * <urlMatcheri>)) ja tyylitiedostot ($api->enqueueCss|JsFile(<urli>)).
     *
     * @param \RadCms\Website\WebsiteAPI $api
     * @param bool $isControlPanelPageLoad
     */
    public function init(WebsiteAPI $api, bool $isControlPanelPageLoad): void {
        if ($isControlPanelPageLoad) return;
        $api->registerLayoutForUrlPattern('templates/layout.generic.tmpl.php', '.*');
        $api->enqueueCssFile('main.css');
    }
}
