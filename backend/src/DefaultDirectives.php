<?php

namespace RadCms;

use RadCms\Templating;

abstract class DefaultDirectives {
    const DIR_PATH = RAD_BASE_PATH . 'src/Common/directives/';
    /**
     * Rekisteröi templaateissa käytettävät oletusdirektiivit kuten
     * <?= $ArticleList($articles) ?> ja <?= Url('url') ?>.
     *
     * @param array &$tmplVars
     */
    public static function registerAll(&$tmplVars) {
        $tmplVars['Url'] = function($url) {
            return RAD_BASE_URL . $url;
        };
        $tmplVars['ArticleList'] = function($arts) use ($tmplVars) {
            return (new Templating(self::DIR_PATH))->render('ArticleList.tmp.php',
                array_merge($tmplVars, ['articles' => $arts])
            );
        };
    }
}
