<?php

namespace RadCms\Website;

use RadCms\Framework\FileSystemInterface;
use RadCms\ContentType\ContentTypeCollection;
use RadCms\Common\RadException;

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
     * @return bool
     * @throws \RadCms\Common\RadException
     */
    public function selfLoad($filePath, $checkLastModTime = true) {
        if ($checkLastModTime && !($this->lastModTime = $this->fs->lastModTime($filePath)))
            throw new RadException('Failed to read mtime of ' . $filePath,
                                   RadException::FAILED_FS_OP);
        if (!($iniStr = $this->fs->read($filePath)))
            throw new RadException('Failed to read ' . $filePath,
                                   RadException::FAILED_FS_OP);
        if (!($parsed = parse_ini_string($iniStr, true, INI_SCANNER_RAW)))
            throw new RadException('Failed to parse ' . $filePath,
                                   RadException::BAD_INPUT);
        [$this->urlMatchers, $this->contentTypes] = $this->parse($parsed);
        return true;
    }
    /**
     * @param array $parsedIniData
     * @return array [\RadCms\Website\UrlMatcherCollection, \RadCms\ContentType\ContentTypeCollection]
     */
    private function parse($parsedIniData) {
        return [$this->collectUrlMatchers($parsedIniData),
                $this->collectContentTypes($parsedIniData)];
    }
    /**
     * @param array $parsed
     * @return \RadCms\Website\UrlMatcherCollection
     */
    private function collectUrlMatchers($parsed) {
        $out = new UrlMatcherCollection();
        static $prefix = 'UrlMatcher:';
        static $prefixLen = 11; // strlen('UrlMatcher:')
        foreach ($parsed as $sectionName => $opts) {
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
    /**
     * @return bool
     * @throws \RadCms\Common\RadException
     */
    public function validateUrlMatchers() {
        foreach ($this->urlMatchers->toArray() as $matcher) {
            if (!$this->fs->isFile(RAD_SITE_PATH . $matcher->layoutFileName))
                throw new RadException('Failed to locate site.ini UrlMatcher layout file "' .
                                       RAD_SITE_PATH . $matcher->layoutFileName . '"',
                                       RadException::BAD_INPUT);
        }
        return true;
    }
}
