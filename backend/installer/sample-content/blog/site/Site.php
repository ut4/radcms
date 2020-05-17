<?php

declare(strict_types=1);

namespace RadSite;

use RadCms\Website\WebsiteAPI;
use RadCms\Website\WebsiteInterface;

class Site implements WebsiteInterface {
    /**
     * Ajetaan jokaisen pyynnön yhteydessä (myös /api/*).
     *
     * @param \RadCms\Website\WebsiteAPI $api
     */
    public function init(WebsiteAPI $api): void {
        //
    }
}
