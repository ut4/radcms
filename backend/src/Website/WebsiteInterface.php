<?php

declare(strict_types=1);

namespace RadCms\Website;

/**
 * Rajapinta, jonka (RAD_PUBLIC_PATH . 'site/Site.php') tulee implementoida.
 */
interface WebsiteInterface {
    /**
     * Metodi joka ajetaan jokaisella "/.", ja "edit/." -sivunlatauksella.
     *
     * @param \RadCms\Website\WebsiteAPI $api
     * @param bool $isControlPanelPageLoad
     */
    public function init(WebsiteAPI $api, bool $isControlPanelPageLoad): void;
}
