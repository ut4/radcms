<?php

namespace RadCms\Website;

use RadCms\Framework\FileSystemInterface;
use RadCms\ContentType\ContentTypeCollection;

/**
 * Lukee, ja pitää sisällään site.ini -tiedostoon conffatut tiedot.
 */
class SiteConfig {
    public $urlMatchers;
    public $contentTypes;
    /**
     * .
     */
    public function __construct() {
        $this->urlMatchers = null;
        $this->contentTypes = null;
    }
    /**
     * @param \RadCms\Framework\FileSystemInterface $fs
     * @param string $filePath Absoluuttinen polku parsattavaan tiedostoon Esim. '/home/me/foo/site.ini'.
     * @param bool $loadContentTypes = true
     * @throws \RuntimeException
     */
    public function load(FileSystemInterface $fs,
                         $filePath,
                         $loadContentTypes = true) {
        if (!($iniStr = $fs->read($filePath)))
            throw new \RuntimeException('Failed to read ' . $filePath);
        [$this->urlMatchers, $this->contentTypes] =
            $this->parse($iniStr, $filePath, $loadContentTypes);
    }
    /**
     * @param string $iniStr
     * @param string $filePath
     * @param bool $loadContentTypes
     * @return array [\RadCms\Website\UrlMatcherCollection, Array<[object]>]
     */
    private function parse($iniStr, $filePath, $loadContentTypes) {
        if (!($parsed = parse_ini_string($iniStr, true, INI_SCANNER_RAW)))
            throw new \RuntimeException('Failed to parse ' . $filePath);
        return [$this->collectUrlMatchers($parsed),
                $loadContentTypes ? $this->collectContentTypes($parsed) : []];
    }
    /**
     * @param array $parsedIniData
     * @return \RadCms\Website\UrlMatcherCollection
     */
    private function collectUrlMatchers($parsedIniData) {
        $out = new UrlMatcherCollection();
        static $prefix = 'UrlMatcher:';
        static $prefixLen = 11; // strlen('UrlMatcher:')
        foreach ($parsedIniData as $sectionName => $opts) {
            if (mb_strpos($sectionName, $prefix) !== 0) continue;
            $out->add($opts['pattern'], mb_substr($sectionName, $prefixLen));
        }
        return $out;
    }
    /**
     * @param array $parsedIniData
     * @return array Array<object>
     */
    private function collectContentTypes($parsedIniData) {
        $out = new ContentTypeCollection();
        static $prefix = 'ContentType:';
        static $prefixLen = 12; // strlen('ContentType:')
        foreach ($parsedIniData as $sectionName => $opts) {
            if (mb_strpos($sectionName, $prefix) !== 0) continue;
            $out->add(mb_substr($sectionName, $prefixLen),
                      $opts['friendlyName'],
                      $opts['fields']);
        }
        return $out;
    }
}
