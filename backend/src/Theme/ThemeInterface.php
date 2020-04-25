<?php

namespace RadCms\Theme;

use RadCms\BaseAPI;

/**
 * Rajapinta, jonka vapaaehtoinen teemaluokka (RAD_PUBLIC_PATH . 'site/Theme.php')
 * tulee implementoida.
 */
interface ThemeInterface {
    /**
     * Metodi joka ajetaan jokaisella "/." -sivunlatauksella.
     */
    public function init(BaseAPI $api);
}
