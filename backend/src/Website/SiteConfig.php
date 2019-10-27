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
    public $lastModTime;
    private $fs;
    /**
     * @param \RadCms\Framework\FileSystemInterface $fs
     */
    public function __construct(FileSystemInterface $fs) {
        $this->fs = $fs;
        $this->urlMatchers = null;
        $this->contentTypes = null;
        $this->lastModTime = 0;
    }
    /**
     * @param string $filePath Absoluuttinen polku parsattavaan tiedostoon Esim. '/home/me/foo/site.ini'.
     * @param bool $checkLastModTime = true
     * @throws \RuntimeException
     */
    public function selfLoad($filePath, $checkLastModTime = true) {
        if ($checkLastModTime && !($this->lastModTime = $this->fs->lastModTime($filePath)))
            throw new \RuntimeException('Failed to read mtime of ' . $filePath);
        if (!($iniStr = $this->fs->read($filePath)))
            throw new \RuntimeException('Failed to read ' . $filePath);
        [$this->urlMatchers, $this->contentTypes] =
            $this->parse($iniStr, $filePath);
    }
    /**
     * @param string $iniStr
     * @param string $filePath
     * @return array [\RadCms\Website\UrlMatcherCollection, \RadCms\ContentType\ContentTypeCollection]
     */
    private function parse($iniStr, $filePath) {
        if (!($parsed = parse_ini_string($iniStr, true, INI_SCANNER_RAW)))
            throw new \RuntimeException('Failed to parse ' . $filePath);
        return [$this->collectUrlMatchers($parsed),
                $this->collectContentTypes($parsed)];
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
     * @return \RadCms\ContentType\ContentTypeCollection
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
