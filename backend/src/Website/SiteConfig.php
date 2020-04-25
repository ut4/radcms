<?php

declare(strict_types=1);

namespace RadCms\Website;

use Pike\FileSystemInterface;
use Pike\PikeException;

/**
 * Lukee, ja pitää sisällään site.json -tiedostoon conffatut tiedot.
 */
class SiteConfig {
    public const ASSET_TYPES = ['localStylesheet', 'localScript'];
    public const DOCUMENT_WEBSITE = 'site';
    public const DOCUMENT_CONTROL_PANEL = 'controlPanel';
    private const ASSET_TARGET_DOCUMENTS = [self::DOCUMENT_WEBSITE,
                                            self::DOCUMENT_CONTROL_PANEL];
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
    public function selfLoad(string $filePath, bool $autoSelfValidate = true): bool {
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
    private function collectAll(\stdClass $input): bool {
        $this->urlMatchers = $this->collectUrlMatchers($input->urlMatchers);
        $this->assets = $this->collectAssets($input->assetFiles ?? []);
        return true;
    }
    /**
     * @param array $inputUrlMatchers
     * @return array
     */
    private function collectUrlMatchers(array $inputUrlMatchers): array {
        $out = [];
        foreach ($inputUrlMatchers as $definition)
            $out[] = new UrlMatcher(...$definition);
        return $out;
    }
    /**
     * @param array $inputAssetFiles
     * @return array array<{url: string, type: 'localStylesheet'|'localScript', targetDocument: 'site'|'controlPanel', attrs: array}>
     */
    private function collectAssets(array $inputAssetFiles): array {
        $out = [];
        foreach ($inputAssetFiles as $definition) {
            $out[] = (object)['url' => $definition[0] ?? '',
                              'type' => $definition[1] ?? '',
                              'targetDocument' => $definition[2] ?? self::DOCUMENT_WEBSITE,
                              'attrs' => count($definition) < 4
                                  ? []
                                  : (array)$definition[3]];
        }
        return $out;
    }
    /**
     * @param \stdClass $input
     * @param string $sitePath i.e. RAD_SITE_PATH
     * @return bool
     * @throws \Pike\PikeException
     */
    private function selfValidate(\stdClass $input, string $sitePath): bool {
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
    public function getCssAssets(): array {
        return array_filter($this->assets, function ($f) {
            return $f->type === self::ASSET_TYPES[0];
        });
    }
    /**
     * @param string $targetDocument 'site'|'controlPanel'
     * @return string[]
     */
    public function getJsAssets(string $targetDocument): array {
        return array_filter($this->assets, function ($f) use ($targetDocument) {
            return $f->type === self::ASSET_TYPES[1] &&
                   $f->targetDocument === $targetDocument;
        });
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
            elseif (@preg_match(UrlMatcher::completeRegexp($pattern), '') === false)
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
            return ['{..."assetFiles": [["file.ext", "assetType", "targetDocument", {"html-attr": "value"}?]]...} must be an array'];
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
            $targetDoc = $definition[2] ?? null;
            if ($targetDoc && !in_array($targetDoc, self::ASSET_TARGET_DOCUMENTS))
                $errors[] = "asdasd";
            $attrs = $definition[3] ?? null;
            if ($attrs && !($attrs instanceof \stdClass))
                $errors[] = "assetFile[{$i}][2] (attrs) must be a \stdClass";
        }
        return $errors;
    }
}
