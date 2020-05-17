<?php

declare(strict_types=1);

namespace RadCms\Website;

/**
 * Rajapinta, jonka (RAD_PUBLIC_PATH . 'site/Site.php') tulee implementoida.
 */
interface WebsiteInterface {
    /**
     * Metodi joka ajetaan jokaisen pyynnön yhteydessä, heti lisäosien jälkeen.
     *
     * @param \RadCms\Website\WebsiteAPI $api
     */
    public function init(WebsiteAPI $api): void;
}
