<?php

namespace RadCms\Templating;

use RadCms\Framework\Template;
use RadCms\Content\DAO;
use RadCms\Common\RadException;
use RadCms\Common\LoggerAccess;
use RadCms\Framework\FileSystem;

/**
 * Sisältää magikaalisen <?= $this->TemplateName(..) ?>-kutsujen mahdollistavan
 * __call-hookin, sekä muut templaateissa käytettävät oletusfunktiot (<?php
 * $nodes = $this->fetchAll(...) ?> ja <?= $this->url('/slug') ?>).
 */
class MagicTemplate extends Template {
    private $__contentNodeDao;
    private $__fileExists;
    private static $__aliases = [];
    /**
     * @param string $file
     * @param array $vars = null
     * @param \RadCms\Content\DAO $dao = null
     * @param \RadCms\Framework\FileSystem $fs = null
     */
    public function __construct($file,
                                array $vars = null,
                                DAO $dao = null,
                                FileSystem $fs = null) {
        parent::__construct($file, $vars);
        $this->__contentNodeDao = $dao;
        $this->__fileExists = function ($path) use ($fs) { return $fs->isFile($path); };
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
        try {
            $directiveFilePath = !array_key_exists($name, self::$__aliases)
                ? RAD_SITE_PATH . $name . '.tmpl.php'
                : self::$__aliases[$name];
            if (!$this->__fileExists->__invoke($directiveFilePath)) {
                throw new RadException('Did you forget to $api->registerDire' .
                                       'ctive(\''.$name.'\', \'/file.php\')?',
                                       RadException::BAD_INPUT);
            }
            return $this->doRender($directiveFilePath,
                $this->__locals + ['props' => $args ? $args[0] : new \stdClass()]);
        } catch (RadException $e) {
            if (!(RAD_FLAGS & RAD_DEVMODE)) {
                LoggerAccess::getLogger()->error($e->getTraceAsString());
                return "Hmm, {$name}() teki jotain odottamatonta.";
            } else {
                throw $e;
            }
        }
    }
    /**
     * @param string $contentTypeName
     * @return RadCms\Content\DAO
     * @throws \RadCms\Common\RadException
     */
    public function fetchAll($contentTypeName) {
        // @allow \RadCms\Common\RadException
        return $this->__contentNodeDao->fetchAll($contentTypeName);
    }
    /**
     * @param string $contentTypeName
     * @return RadCms\Content\DAO
     * @throws \RadCms\Common\RadException
     */
    public function fetchOne($contentTypeName) {
        // @allow \RadCms\Common\RadException
        return $this->__contentNodeDao->fetchOne($contentTypeName);
    }
    /**
     * @param string $url
     * @param bool $withIndexFile = true
     * @return string
     */
    public function url($url, $withIndexFile = true) {
        static $indexFile = !RAD_QUERY_VAR ? '' : 'index.php?' . RAD_QUERY_VAR . '=/';
        return RAD_BASE_URL . ($withIndexFile ? $indexFile : '') . ltrim($url, '/');
    }
    /**
     * @param string $url
     * @return string
     */
    public function assetUrl($url) {
        return $this->url($url, false);
    }
    /**
     * @return string
     */
    public function cssFiles() {
        return implode(' ', array_map(function ($url) {
            return '<link href="' . $this->assetUrl($this->e($url)) . '" rel="stylesheet">';
        }, $this->cssFiles));
    }
    /**
     * @param string $str
     * @return string
     */
    public function e($str) {
        return htmlspecialchars($str);
    }
    /**
     * @param string $directiveName
     * @param string $fullFilePath
     * @throws \RadCms\Common\RadException
     */
    public static function addAlias($directiveName, $fullFilePath) {
        if (array_key_exists($directiveName, self::$__aliases))
            throw new RadException("Alias {$directiveName} is already registered.",
                                   RadException::BAD_INPUT);
        self::$__aliases[$directiveName] = $fullFilePath;
    }
}
