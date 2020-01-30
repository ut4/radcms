<?php

namespace RadCms\Theme;

/**
 * Rajapinta, jonka vapaaehtoinen teemaluokka (RAD_SITE_PATH . 'theme/Theme.php')
 * tulee implementoida.
 */
interface ThemeInterface {
    /**
     * Metodi joka ajetaan jokaisella "/.", ja "/edit." -sivunlatauksella.
     */
    public function init(API $api);
}
