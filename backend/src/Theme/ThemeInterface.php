<?php

namespace RadCms\Theme;

/**
 * Rajapinta, jonka vapaaehtoinen teemaluokka (RAD_PUBLIC_PATH . 'site/Theme.php')
 * tulee implementoida.
 */
interface ThemeInterface {
    /**
     * Metodi joka ajetaan jokaisella "/." -sivunlatauksella.
     *
     * @param \RadCms\Theme\ThemeAPI $api
     */
    public function init(ThemeAPI $api);
}
