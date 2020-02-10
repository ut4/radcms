<?php

namespace RadCms\Templating;

use Pike\Template;
use RadCms\Content\MagicTemplateDAO;
use Pike\PikeException;
use RadCms\Common\LoggerAccess;
use Pike\FileSystem;

/**
 * Sisältää magikaalisen <?= $this->TemplateName(..) ?>-kutsujen mahdollistavan
 * __call-hookin, sekä muut templaateissa käytettävät oletusfunktiot (<?php
 * $nodes = $this->fetchAll(...) ?> ja <?= $this->url('/slug') ?>).
 */
class MagicTemplate extends Template {
    private $__contentDao;
    private $__fileExists;
    private $__aliases;
    private $__funcs;
    /**
     * @param string $file
     * @param array $vars = null
     * @param \RadCms\Content\MagicTemplateDAO $dao = null
     * @param \Pike\FileSystem $fs = null
     */
    public function __construct($file,
                                array $vars = null,
                                MagicTemplateDAO $dao = null,
                                FileSystem $fs = null) {
        parent::__construct($file, $vars);
        $this->__contentDao = $dao;
        $this->__fileExists = function ($path) use ($fs) { return $fs->isFile($path); };
        $this->__aliases = [];
        $this->__funcs = [];
    }
    /**
     * Renderöi templaatin `${$this->dir}${$this->aliases[$name] || $name}.tmpl.php`.
     * Esim. kutsu $this->Foo() renderöi templaatin "/foo/Foo.tmpl.php" (jos
     * ${$this->dir} on "/foo/"), ja "c:/baz/my-foo.inc" (jos $this->aliases['Foo']
     * on "c:/baz/my-foo.inc"). $this->dir viittaa aina kansioon, jossa renderöitävä
     * templatti sijaitsee.
     *
     * @param string $name
     * @param array $args
     * @return string
     */
    public function __call($name, $args) {
        try {
            if (array_key_exists($name, $this->__funcs))
                return call_user_func_array($this->__funcs[$name],
                                            array_merge($args, [$this]));
            $directiveFilePath = !array_key_exists($name, $this->__aliases)
                ? "{$this->__dir}{$name}.tmpl.php"
                : $this->__aliases[$name];
            if (!$this->__fileExists->__invoke($directiveFilePath)) {
                return "Did you forget to \$api->registerDirective('{$name}', '/file.php')?";
            }
            return $this->doRender($directiveFilePath,
                $this->__locals + ['props' => $args ? $args[0] : []]);
        } catch (PikeException $e) {
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
     * @return \RadCms\Content\Query
     * @throws \Pike\PikeException
     */
    public function fetchAll($contentTypeName) {
        // @allow \Pike\PikeException
        return $this->__contentDao->fetchAll($contentTypeName);
    }
    /**
     * @param string $contentTypeName
     * @return \RadCms\Content\Query
     * @throws \Pike\PikeException
     */
    public function fetchOne($contentTypeName) {
        // @allow \Pike\PikeException
        return $this->__contentDao->fetchOne($contentTypeName);
    }
    /**
     * @param string $str
     * @return string
     */
    public function e($str) {
        return htmlspecialchars($str);
    }
    /**
     * @param string $url
     * @param bool $withIndexFile = true
     * @return string
     */
    public static function url($url, $withIndexFile = true) {
        return self::makeUrl($url, $withIndexFile);
    }
    /**
     * @param string $url
     * @return string
     */
    public function assetUrl($url) {
        return self::makeUrl($url, false);
    }
    /**
     * @param string $url
     * @param bool $withIndexFile = true
     * @return string
     */
    public static function makeUrl($url, $withIndexFile = true) {
        static $indexFile = !RAD_QUERY_VAR ? '' : 'index.php?' . RAD_QUERY_VAR . '=/';
        return RAD_BASE_URL . ($withIndexFile ? $indexFile : '') . ltrim($url, '/');
    }
    /**
     * @return string
     */
    public function cssFiles() {
        return implode(' ', array_map(function ($f) {
            $attrsMap = $f->attrs;
            if (!array_key_exists('rel', $attrsMap)) $attrsMap['rel'] = 'stylesheet';
            return '<link href="' . $this->assetUrl('theme/' . $this->e($f->url)) .
                   '"' . self::attrMapToStr($attrsMap) . '>';
        }, $this->_cssFiles));
    }
    /**
     * @return string
     */
    public function jsFiles() {
        return implode(' ', array_map(function ($f) {
            return '<script src="' . $this->assetUrl('theme/' . $this->e($f->url)) .
                   '"' . ($f->attrs ? '' : self::attrMapToStr($f->attrs)) .
                   '></script>';
        }, $this->_jsFiles));
    }
    /**
     * @param array $files Array<string>|Array<{fileName: string, attrs?: object}>
     * @param bool $includeVendor = true
     * @return string <script src="frontend/file.js">... tai.
     *                <script src="frontend/file.js" type="module">...
     */
    public function jsBundle($files, $includeVendor = true) {
        $baseAttrs = !(RAD_FLAGS & RAD_USE_JS_MODULES) ? [] : ['type' => 'module'];
        return ($includeVendor
            ? '<script src="'. $this->assetUrl('frontend/vendor/vendor.bundle.min.js') . '"></script>'
            : '') .
        implode('', array_map(function ($f) use ($baseAttrs) {
            [$url, $attrs] = is_string($f)
                ? [$f, $baseAttrs]
                : [$f->fileName, array_merge($f->attrs, $baseAttrs)];
            return '<script src="' . $this->assetUrl($this->e($url)) . '"' .
                   self::attrMapToStr($attrs) . '></script>' . PHP_EOL;
        }, $files));
    }
    /**
     * @param string $directiveName
     * @param string $fullFilePath
     * @throws \Pike\PikeException
     */
    public function registerAlias($directiveName, $fullFilePath) {
        $this->__aliases[$directiveName] = $fullFilePath;
    }
    /**
     * @param string $name
     * @param \Closure|callable $fn
     * @param bool $bindThis
     */
    public function registerMethod($name, $fn, $bindThis) {
        $this->__funcs[$name] = $bindThis ? \Closure::bind($fn, $this) : $fn;
    }
    /**
     * ['id' => 'foo', 'class' => 'bar'] -> ' id="foo" class="bar"'
     *
     * @param array|object $map
     * @return string
     */
    private static function attrMapToStr($map) {
        $pairs = [];
        foreach ($map as $key => $val) $pairs[] = " {$key}=\"{$val}\"";
        return htmlspecialchars(implode('' , $pairs), ENT_NOQUOTES);
    }
}
