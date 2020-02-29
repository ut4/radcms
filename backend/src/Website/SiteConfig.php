<?php

namespace RadCms\Website;

use Pike\FileSystemInterface;
use Pike\PikeException;

/**
 * Lukee, ja pitää sisällään site.json -tiedostoon conffatut tiedot.
 */
class SiteConfig {
    public const ASSET_TYPES = ['local-stylesheet', 'local-script'];
    public $urlMatchers;
    private $assets;
    private $fs;
    /**
     * @param \Pike\FileSystemInterface $fs
     */
    public function __construct(FileSystemInterface $fs) {
        $this->fs = $fs;
    }
    /**
     * @param string $filePath Absoluuttinen polku configurointitiedostoon Esim. '/home/me/foo/site.json'.
     * @param bool $autoSelfValidate = true
     * @return bool
     * @throws \Pike\PikeException
     */
    public function selfLoad($filePath, $autoSelfValidate = true) {
        if (!($str = $this->fs->read($filePath)))
            throw new PikeException("Failed to read `{$filePath}`",
                                    PikeException::FAILED_FS_OP);
        if (!(($parsed = json_decode($str)) instanceof \stdClass))
            throw new PikeException("Failed to parse `{$filePath}`",
                                    PikeException::BAD_INPUT);
        //
        return (!$autoSelfValidate ||
                $this->selfValidate($parsed, dirname($filePath) . '/theme/')) &&
                $this->collectAll($parsed);
    }
    /**
     * @param \stdClass $input
     * @return bool
     * @throws \Pike\PikeException
     */
    private function collectAll($input) {
        $this->urlMatchers = $this->collectUrlMatchers($input->urlMatchers);
        $this->assets = $this->collectAssets($input->assetFiles ?? []);
        return true;
    }
    /**
     * @param array $inputUrlMatchers
     * @return array
     */
    private function collectUrlMatchers($inputUrlMatchers) {
        $out = [];
        foreach ($inputUrlMatchers as $definition)
            $out[] = new UrlMatcher(...$definition);
        return $out;
    }
    /**
     * @param array $inputAssetFiles
     * @return array array<{url: string, type: string, attrs: array}>
     */
    private function collectAssets($inputAssetFiles) {
        $out = [];
        foreach ($inputAssetFiles as $definition) {
            $out[] = (object)['url' => $definition[0] ?? '',
                              'type' => $definition[1] ?? '',
                              'attrs' => count($definition) < 3
                                  ? []
                                  : (array)$definition[2]];
        }
        return $out;
    }
    /**
     * @param \stdClass $input
     * @param string $sitePath i.e. RAD_SITE_PATH
     * @return bool
     * @throws \Pike\PikeException
     */
    private function selfValidate($input, $sitePath) {
        if (!($errors = array_merge($this->validateUrlMatchers($input->urlMatchers ?? [],
                                                               $sitePath),
                                    $this->validateAssets($input->assetFiles ?? [])))) {
            return true;
        }
        throw new PikeException('site.json was invalid:' . PHP_EOL .
                                implode(PHP_EOL, $errors),
                                PikeException::BAD_INPUT);
    }
    /**
     * @return string[]
     */
    public function __get($name) {
        if ($name === 'cssAssets')
            return array_filter($this->assets, function ($f) {
                return $f->type === 'local-stylesheet';
            });
        if ($name === 'jsAssets')
            return array_filter($this->assets, function ($f) {
                return $f->type === 'local-script';
            });
        throw new PikeException("What's {$name}?", PikeException::BAD_INPUT);
    }
    /**
     * @return string[]
     */
    private function validateUrlMatchers($inputUrlMatchers, $sitePath) {
        if (!$inputUrlMatchers || !is_array($inputUrlMatchers))
            return ['{..."urlMatchers": ["pattern", "layout.php"]} is required'];
        $errors = [];
        foreach ($inputUrlMatchers as $i => $definition) {
            if (!is_array($definition) || count($definition) !== 2) {
                $errors[] = 'urlMatcher must be an array {..."urlMatchers": [["pattern", "layout.tmpl.php"]]...}';
                continue;
            }
            [$pattern, $layout] = $definition;
            if (!is_string($pattern) || !strlen($pattern))
                $errors[] = 'urlMatcher['.$i.'].pattern must be a string';
            elseif (@preg_match(UrlMatcher::completeRegexp($pattern), null) === false)
                $errors[] = "{$pattern} is not valid regexp";
            if (!$this->fs->isFile($sitePath . $layout))
                $errors[] = 'Failed to locate UrlMatcher layout file `' .
                            $sitePath . $layout . '`';
        }
        return $errors;
    }
    /**
     * @return string[]
     */
    private function validateAssets($inputAssetFiles) {
        if ($inputAssetFiles && !is_array($inputAssetFiles))
            return ['{..."assetFiles": [["file.ext", "asset-type", {"html-attr": "value"}?]]...} must be an array'];
        $errors = [];
        foreach ($inputAssetFiles as $i => $definition) {
            if (!is_array($definition) || count($definition) < 2) {
                $errors[] = 'assetFile must be an array';
                continue;
            }
            [$url, $type] = $definition;
            if (!is_string($url) || !strlen($url))
                $errors[] = "assetFile[{$i}][0] (url) must be a string";
            if (!in_array($type, self::ASSET_TYPES, true))
                $errors[] = 'assetFile[' . $i . '][1] (file type) must be ' .
                            implode('|', self::ASSET_TYPES);
            $attrs = $definition[2] ?? null;
            if ($attrs && !($attrs instanceof \stdClass))
                $errors[] = "assetFile[{$i}][2] (attrs) must be a \stdClass";
        }
        return $errors;
    }
}
