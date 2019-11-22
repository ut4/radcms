<?php

namespace RadCms\Website;

use RadCms\Framework\FileSystemInterface;
use RadCms\ContentType\ContentTypeCollection;
use RadCms\Common\RadException;

/**
 * Lukee, ja pitää sisällään site.ini -tiedostoon conffatut tiedot.
 */
class SiteConfig {
    public const ASSET_TYPES = ['local-stylesheet', 'local-javascript'];
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
     * @param string $filePath Absoluuttinen polku parsattavaan tiedostoon Esim. '/home/me/foo/site.ini'.
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
        if (!($iniStr = $this->fs->read($filePath)))
            throw new RadException('Failed to read ' . $filePath,
                                   RadException::FAILED_FS_OP);
        if (!($parsed = parse_ini_string($iniStr, true, INI_SCANNER_RAW)))
            throw new RadException('Failed to parse ' . $filePath,
                                   RadException::BAD_INPUT);
        return $this->collectAll($parsed) &&
               (!$autoSelfValidate || $this->selfValidate(dirname($filePath) . '/'));
    }
    /**
     * @param array $parsedIniData
     * @return bool
     * @throws \RadCms\Common\RadException
     */
    private function collectAll($parsedIniData) {
        $this->urlMatchers = $this->collectUrlMatchers($parsedIniData);
        $this->contentTypes = $this->collectContentTypes($parsedIniData);
        $this->assets = $this->collectAssets($parsedIniData);
        return true;
    }
    /**
     * @param array $iniData
     * @return \RadCms\Website\UrlMatcherCollection
     */
    private function collectUrlMatchers($iniData) {
        $out = new UrlMatcherCollection();
        static $prefix = 'UrlMatcher:';
        static $prefixLen = 11; // strlen('UrlMatcher:')
        foreach ($iniData as $sectionName => $opts) {
            if (mb_strpos($sectionName, $prefix) !== 0) continue;
            $out->add($opts['pattern'] ?? '', $opts['layout'] ?? '');
        }
        return $out;
    }
    /**
     * @param array $parsedIniData
     * @return \RadCms\ContentType\ContentTypeCollection
     */
    private function collectContentTypes($iniData) {
        $out = new ContentTypeCollection();
        static $prefix = 'ContentType:';
        static $prefixLen = 12; // strlen('ContentType:')
        foreach ($iniData as $sectionName => $opts) {
            if (mb_strpos($sectionName, $prefix) !== 0) continue;
            $name = mb_substr($sectionName, $prefixLen);
            $out->add($name, $opts['friendlyName'] ?? $name, $opts['fields'] ?? []);
        }
        return $out;
    }
    /**
     * @param array $iniData
     * @return array $errors
     */
    private function collectAssets($iniData) {
        $out = [];
        static $prefix = 'AssetFile:';
        static $prefixLen = 10; // strlen('AssetFile:')
        foreach ($iniData as $sectionName => $opts) {
            if (mb_strpos($sectionName, $prefix) !== 0) continue;
            $out[] = (object)['url' => $opts['url'] ?? '',
                              'type' => $opts['type'] ?? ''];
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
            foreach ($this->urlMatchers->toArray() as $matcher) {
                if (!$matcher->origPattern)
                    $errors[] = '$urlMatcher->pattern can\'t be empty ([UrlMatcher:' .
                                $matcher->url . '] pattern = some-regexp)';
                elseif (@preg_match($matcher->pattern, null) === false)
                    $errors[] = $matcher->origPattern . ' (' . $matcher->pattern
                                . ') is not valid regexp';
                if (!$this->fs->isFile($sitePath . $matcher->layoutFileName))
                    $errors[] = 'Failed to locate UrlMatcher layout file `' .
                                $sitePath . $matcher->layoutFileName . '`';
            }
        } else {
            $errors[] = 'At least one `[UrlMatcher:name] pattern = /some-url` is required';
        }
        //
        if (!$this->contentTypes->length()) {
            $errors[] = 'At least one `[ContentType:MyContentType] fields[name] = data-type` is required';
        }
        //
        foreach ($this->assets as $asset) {
            if (!$asset->url)
                $errors[] = '[AssetFile:name] must define field `url = file.css`';
            if (array_search($asset->type, self::ASSET_TYPES) === false)
                $errors[] = '[AssetFile:name] must define field' .
                            ' `type = ' . implode('|', self::ASSET_TYPES) . '`';
        }
        if (!$errors) {
            return true;
        }
        throw new RadException('site.ini was invalid:' . PHP_EOL .
                               implode(PHP_EOL, $errors),
                               RadException::BAD_INPUT);
    }
    /**
     * @return string[]
     */
    public function __get($name) {
        if ($name == 'cssAssets') {
            $out = [];
            foreach ($this->assets as $a)
                if ($a->type == 'local-stylesheet') $out[] = $a->url;
            return $out;
        }
        throw new RadException("What's {$name}?", RadException::BAD_INPUT);
    }
}
