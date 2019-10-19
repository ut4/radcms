<?php

namespace RadCms\Templating;

use RadCms\Framework\Template;
use RadCms\Content\DAO;

/**
 * Sisältää magikaalisen <?= $this->TemplateName(..) ?>-kutsujen mahdollistavan
 * __call-hookin, sekä muut templaateissa käytettävät oletusfunktiot (<?php
 * $nodes = $this->fetchAll(...) ?> ja <?= $this->url('/slug') ?>).
 */
class MagicTemplate extends Template {
    private $__contentNodeDao;
    private $__aliases;
    /**
     * @param string $file
     * @param array $vars = null
     * @param \RadCms\Content\DAO $dao = null
     */
    public function __construct($file, array $vars = null, DAO $dao = null) {
        parent::__construct($file, $vars);
        $this->__contentNodeDao = $dao;
        $this->__aliases = [];
    }
    /**
     * Renderöi templaatin `${RAD_SITE_PATH}${$this->aliases[$name] || $name}.tmpl.php`.
     * Esim. kutsu $this->Foo() renderöi templaatin "/foo/Foo.tmpl.php" (jos
     * RAD_SITE_PATH on "/foo/"), ja "c:/baz/dir/my-foo.tmpl.php" (jos
     * RAD_SITE_PATH on "c:/baz/", ja $this->aliases['Foo'] on "dir/my-foo").
     *
     * @param string $name
     * @param array $args
     * @return string
     */
    public function __call($name, $args) {
        if (isset($this->__aliases[$name]))
            $name = $this->__aliases[$name];
        return $this->doRender(RAD_SITE_PATH . $name . '.tmpl.php',
                               ['props' => $args ? $args[0] : new \stdClass()]);
    }
    /**
     * @param string $contentTypeName
     * @return RadCms\Content\DAO
     */
    public function fetchAll($contentTypeName) {
        return $this->__contentNodeDao->fetchAll($contentTypeName);
    }
    /**
     * @param string $contentTypeName
     * @return RadCms\Content\DAO
     */
    public function fetchOne($contentTypeName) {
        return $this->__contentNodeDao->fetchOne($contentTypeName);
    }
    /**
     * @param string $url
     * @return string
     */
    public function url($url) {
        return RAD_BASE_URL . ltrim($url, '/');
    }
}
