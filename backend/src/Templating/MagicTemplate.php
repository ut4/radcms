<?php

declare(strict_types=1);

namespace RadCms\Templating;

use Pike\{FileSystem, PikeException, Template, Translator};
use RadCms\Content\{MagicTemplateDAO, MagicTemplateQuery};
use RadCms\{Common\LoggerAccess, ValidationUtils};

/**
 * Sisältää magikaalisen <?= $this->TemplateName(..) ?>-kutsujen mahdollistavan
 * __call-hookin, sekä muut templaateissa käytettävät oletusfunktiot (<?php
 * $nodes = $this->fetchAll(...) ?> ja <?= $this->url('/slug') ?>).
 */
class MagicTemplate extends Template {
    private $__contentDao;
    private $__translator;
    private $__fileExists;
    private $__aliases;
    private $__funcs;
    /**
     * @param string $file
     * @param array $vars = null
     * @param \Pike\Translator $translator = null
     * @param \RadCms\Content\MagicTemplateDAO $dao = null
     * @param \Pike\FileSystem $fs = null
     */
    public function __construct(string $file,
                                array $vars = null,
                                Translator $translator = null,
                                MagicTemplateDAO $dao = null,
                                FileSystem $fs = null) {
        parent::__construct($file, $vars);
        $this->__contentDao = $dao;
        $this->__translator = $translator;
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
    public function __call(string $name, array $args) {
        try {
            if (array_key_exists($name, $this->__funcs))
                return call_user_func_array($this->__funcs[$name],
                                            array_merge($args, [$this]));
            $alias = $this->__aliases[$name] ?? '';
            if (!$alias) {
                ValidationUtils::checkIfValidaPathOrThrow($name, true);
                $directiveFilePath = "{$this->__dir}{$name}.tmpl.php";
            } else {
                $directiveFilePath = $alias;
            }
            if (!$this->__fileExists->__invoke($directiveFilePath))
                return "Did you forget to \$api->registerDirective(" .
                                        "'{$name}', '/file.tmpl.php')?";
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
    public function fetchAll(string $contentTypeName): MagicTemplateQuery {
        // @allow \Pike\PikeException
        return $this->__contentDao->fetchAll($contentTypeName);
    }
    /**
     * @param string $contentTypeName
     * @return \RadCms\Content\Query
     * @throws \Pike\PikeException
     */
    public function fetchOne(string $contentTypeName): MagicTemplateQuery {
        // @allow \Pike\PikeException
        return $this->__contentDao->fetchOne($contentTypeName);
    }
    /**
     * @param string $key
     * @param mixed[] $args
     * @return string
     */
    public function __(string $key, ...$args): string {
        return $this->__translator->t($this->e($key), $args);
    }
    /**
     * @param string $str
     * @return string
     */
    public static function e(string $str): string {
        return htmlspecialchars($str);
    }
    /**
     * @param string $url
     * @param bool $withIndexFile = true
     * @return string
     */
    public static function url(string $url, bool $withIndexFile = true): string {
        return self::makeUrl($url, $withIndexFile);
    }
    /**
     * @param string $url
     * @return string
     */
    public function assetUrl(string $url): string {
        return self::makeUrl($url, false);
    }
    /**
     * @param string $url
     * @param bool $withIndexFile = true
     * @return string
     */
    public static function makeUrl(string $url, bool $withIndexFile = true): string {
        static $indexFile = !RAD_QUERY_VAR ? '' : 'index.php?' . RAD_QUERY_VAR . '=/';
        return RAD_BASE_URL . ($withIndexFile ? $indexFile : '') . self::e(ltrim($url, '/'));
    }
    /**
     * @return string
     */
    public function cssFiles(): string {
        return implode(' ', array_map(function ($f) {
            $attrsMap = $f->attrs;
            if (!array_key_exists('rel', $attrsMap)) $attrsMap['rel'] = 'stylesheet';
            return '<link href="' . $this->assetUrl("frontend/{$this->e($f->url)}") .
                   '"' . self::attrMapToStr($attrsMap) . '>';
        }, $this->_cssFiles));
    }
    /**
     * @return string
     */
    public function jsFiles(): string {
        return implode(' ', array_map(function ($f) {
            ValidationUtils::checkIfValidaPathOrThrow($f->url);
            return '<script src="' . $this->assetUrl("frontend/{$this->e($f->url)}") .
                   '"' . ($f->attrs ? '' : self::attrMapToStr($f->attrs)) .
                   '></script>';
        }, $this->_jsFiles));
    }
    /**
     * @param array $files array<string>|array<{url: string, attrs?: \stdClass}>
     * @param bool $includeVendor = true
     * @return string <script src="frontend/file.js">... tai.
     *                <script src="frontend/file.js" type="module">...
     */
    public function jsBundle(array $files, bool $includeVendor = true): string {
        $baseAttrs = !(RAD_FLAGS & RAD_USE_JS_MODULES) ? [] : ['type' => 'module'];
        return ($includeVendor
            ? '<script src="'. $this->assetUrl('frontend/rad/vendor/vendor.bundle.min.js') . '"></script>'
            : '') .
        implode('', array_map(function ($f) use ($baseAttrs) {
            [$url, $attrs] = is_string($f)
                ? [$f, $baseAttrs]
                : [$f->url, array_merge($f->attrs, $baseAttrs)];
            ValidationUtils::checkIfValidaPathOrThrow($f->url);
            return '<script src="' . $this->assetUrl("frontend/{$this->e($url)}") . '"' .
                   self::attrMapToStr($attrs) . '></script>' . PHP_EOL;
        }, $files));
    }
    /**
     * @param string $directiveName
     * @param string $fullFilePath
     * @throws \Pike\PikeException
     */
    public function registerAlias(string $directiveName,
                                  string $fullFilePath): void {
        $this->__aliases[$directiveName] = $fullFilePath;
    }
    /**
     * @param string $name
     * @param \Closure|callable $fn
     * @param bool $bindThis
     */
    public function registerMethod(string $name, $fn, bool $bindThis): void {
        $this->__funcs[$name] = $bindThis ? \Closure::bind($fn, $this) : $fn;
    }
    /**
     * ['id' => 'foo', 'class' => 'bar'] -> ' id="foo" class="bar"'
     *
     * @param array|object $map
     * @return string
     */
    private static function attrMapToStr($map): string {
        $pairs = [];
        foreach ($map as $key => $val) $pairs[] = " {$key}=\"{$val}\"";
        return htmlspecialchars(implode('' , $pairs), ENT_NOQUOTES);
    }
}
