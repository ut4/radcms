<?php

namespace RadCms\Website;

use RadCms\Framework\FileSystemInterface;
use RadCms\ContentType\ContentTypeCollection;
use RadCms\Common\RadException;

/**
 * Lukee, ja pitää sisällään site.json -tiedostoon conffatut tiedot.
 */
class SiteConfig {
    public const ASSET_TYPES = ['local-stylesheet', 'local-script'];
    public $urlMatchers;
    public $contentTypes;
    public $lastModTime;
    private $assets;
    private $fs;
    /**
     * @param \RadCms\Framework\FileSystemInterface $fs
     */
    public function __construct(FileSystemInterface $fs) {
        $this->lastModTime = 0;
        $this->fs = $fs;
    }
    /**
     * @param string $filePath Absoluuttinen polku parsattavaan tiedostoon Esim. '/home/me/foo/site.json'.
     * @param bool $checkLastModTime = true
     * @param bool $autoSelfValidate = true
     * @return bool
     * @throws \RadCms\Common\RadException
     */
    public function selfLoad($filePath,
                             $checkLastModTime = true,
                             $autoSelfValidate = true) {
        if ($checkLastModTime && !($this->lastModTime = $this->fs->lastModTime($filePath)))
            throw new RadException('Failed to read mtime of ' . $filePath,
                                   RadException::FAILED_FS_OP);
        if (!($str = $this->fs->read($filePath)))
            throw new RadException('Failed to read ' . $filePath,
                                   RadException::FAILED_FS_OP);
        if (!(($parsed = json_decode($str)) instanceof \stdClass))
            throw new RadException('Failed to parse ' . $filePath,
                                   RadException::BAD_INPUT);
        return $this->collectAll($parsed) &&
               (!$autoSelfValidate || $this->selfValidate(dirname($filePath) . '/'));
    }
    /**
     * @param object $cfgInput
     * @return bool
     * @throws \RadCms\Common\RadException
     */
    private function collectAll($cfgInput) {
        $this->urlMatchers = $this->collectUrlMatchers($cfgInput);
        $this->contentTypes = $this->collectContentTypes($cfgInput);
        $this->assets = $this->collectAssets($cfgInput);
        return true;
    }
    /**
     * @param object $cfgInput
     * @return \RadCms\Website\UrlMatcherCollection
     */
    private function collectUrlMatchers($cfgInput) {
        $out = new UrlMatcherCollection();
        foreach ($cfgInput->urlMatchers ?? [] as $definition) {
            if (!is_array($definition)) continue;
            $out->add($definition[0] ?? '', $definition[1] ?? '');
        }
        return $out;
    }
    /**
     * @param object $cfgInput
     * @return \RadCms\ContentType\ContentTypeCollection
     */
    private function collectContentTypes($cfgInput) {
        $out = new ContentTypeCollection();
        foreach ($cfgInput->contentTypes ?? [] as $definition) {
            if (!is_array($definition)) continue;
            $name = $definition[0];
            $out->add($name, $definition[1] ?? '', $definition[2] ?? []);
        }
        return $out;
    }
    /**
     * @param object $cfgInput
     * @return array Array<{url: string, type: string, attrs: object}>
     */
    private function collectAssets($cfgInput) {
        $out = [];
        foreach ($cfgInput->assetFiles ?? [] as $definition) {
            if (!is_array($definition)) $definition = ['', ''];
            $attrs = [];
            if (count($definition) > 2)
                $attrs = $definition[2] instanceof \stdClass
                    ? (array)$definition[2]
                    : 'invalid';
            $out[] = (object)['url' => $definition[0] ?? '',
                              'type' => $definition[1] ?? '',
                              'attrs' => $attrs];
        }
        return $out;
    }
    /**
     * @param string $sitePath i.e. RAD_SITE_PATH
     * @return bool
     * @throws \RadCms\Common\RadException
     */
    private function selfValidate($sitePath) {
        $errors = [];
        if ($this->urlMatchers->length()) {
            foreach ($this->urlMatchers->toArray() as $i => $matcher) {
                if (!$matcher->origPattern)
                    $errors[] = 'Invalid urlMatcher #'.$i.', should be {..."urlMatchers": [["pattern", "layout.tmpl.php"]]...}';
                elseif (@preg_match($matcher->pattern, null) === false)
                    $errors[] = $matcher->origPattern . ' (' . $matcher->pattern
                                . ') is not valid regexp';
                if ($matcher->origPattern &&
                    !$this->fs->isFile($sitePath . $matcher->layoutFileName))
                    $errors[] = 'Failed to locate UrlMatcher layout file `' .
                                $sitePath . $matcher->layoutFileName . '`';
            }
        } else {
            $errors[] = '`{..."urlMatchers": ["pattern", "layout-file.tmpl.php"]...}` is required';
        }
        //
        if (!$this->contentTypes->length()) {
            $errors[] = '`{..."contentTypes": ["MyType", "Friendly name", {"name": "datatype"}]...}` is required';
        }
        //
        foreach ($this->assets as $i => $asset) {
            if (!$asset->url)
                $errors[] = 'Invalid assetFile #'.$i.', should be {..."assetFiles": [["file.ext", "asset-type", {"html-attr": "value"}?]]...}';
            elseif (array_search($asset->type, self::ASSET_TYPES) === false)
                $errors[] = 'Invalid assetFile type, should be one of ' .
                            implode('|', self::ASSET_TYPES);
            if ($asset->url && !is_array($asset->attrs))
                $errors[] = 'assetFile->attrs must be an object';
        }
        if (!$errors) {
            return true;
        }
        throw new RadException('site.json was invalid:' . PHP_EOL .
                               implode(PHP_EOL, $errors),
                               RadException::BAD_INPUT);
    }
    /**
     * @return string[]
     */
    public function __get($name) {
        if ($name == 'cssAssets')
            return array_filter($this->assets, function ($f) {
                return $f->type == 'local-stylesheet';
            });
        if ($name == 'jsAssets')
            return array_filter($this->assets, function ($f) {
                return $f->type == 'local-script';
            });
        throw new RadException("What's {$name}?", RadException::BAD_INPUT);
    }
}
