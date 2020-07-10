<?php

declare(strict_types=1);

namespace RadCms;

use Pike\FileSystemInterface;
use Pike\PikeException;
use RadCms\Templating\MagicTemplate;
use RadCms\Website\UrlMatcher;

/**
 * Varastoi \RadCms\BaseAPI & \RadCms\Plugin\API -wräppereissä configuroidut tiedot.
 * Mahdollistaa sen, että api-luokista voi luoda useita instansseja (koska tieto
 * varastoituu yhteen, tästä luokasta luotuun instanssiin), ja että rekisteröity
 * tieto pysyy niiden ulottumattomissa.
 */
class APIConfigsStorage {
    /** @var array<string, array<string, array>> */
    private $templateAliases;
    /** @var array<string, array<string, array>> */
    private $templateFuncs;
    /** @var array<string, \stdClass[]> */
    private $jsFiles;
    /** @var array<string, \stdClass[]> */
    private $cssFiles;
    /** @var array<string, \stdClass> */
    private $frontendAdminPanels;
    /** @var array<string, \RadCms\Website\UrlMatcher> */
    private $urlMatchers;
    /** @var array<string, callable[]> */
    private $eventListeners;
    /** @var \Pike\FileSystemInterface */
    private $fs;
    /**
     * @param \Pike\FileSystemInterface $fs
     */
    public function __construct(FileSystemInterface $fs) {
        $this->templateAliases = [];
        $this->templateFuncs = [];
        $this->jsFiles = [BaseAPI::TARGET_WEBSITE_LAYOUT => [],
                          BaseAPI::TARGET_CONTROL_PANEL_LAYOUT => []];
        $this->cssFiles = [BaseAPI::TARGET_WEBSITE_LAYOUT => [],
                           BaseAPI::TARGET_CONTROL_PANEL_LAYOUT => []];
        $this->frontendAdminPanels = [];
        $this->urlMatchers = [];
        $this->eventListeners = [];
        $this->fs = $fs;
    }
    /**
     * @see \RadCms\BaseAPI->registerDirective().
     */
    public function putTemplateAlias(string $directiveName,
                                     string $fullFilePath,
                                     string $for): void {
        if (RAD_FLAGS & RAD_DEVMODE) {
            if (array_key_exists($directiveName, $this->getRegisteredTemplateAliases($for)))
                throw new PikeException("Alias `{$directiveName}` is already registered.",
                                        PikeException::BAD_INPUT);
            if (!$this->fs->isFile($fullFilePath))
                throw new PikeException("Failed to locate `{$fullFilePath}`",
                                        PikeException::BAD_INPUT);
        }
        $this->templateAliases[$for][$directiveName] = [$directiveName, $fullFilePath];
    }
    /**
     * @see \RadCms\BaseAPI->registerDirectiveMethod().
     */
    public function putTemplateMethod(string $methodName,
                                      callable $fn,
                                      bool $bindToDirectiveScope,
                                      string $for): void {
        if (RAD_FLAGS & RAD_DEVMODE) {
            if (array_key_exists($methodName, $this->getRegisteredTemplateMethods($for)))
                throw new PikeException("Method `{$methodName}` is already registered.",
                                        PikeException::BAD_INPUT);
            if ($bindToDirectiveScope && !($fn instanceof \Closure))
                throw new PikeException('$fn must be instaceof \Closure if $bind = true',
                                        PikeException::BAD_INPUT);
        }
        $this->templateFuncs[$for][$methodName] = [$methodName, $fn, $bindToDirectiveScope];
    }
    /**
     * @param \RadCms\Templating\MagicTemplate $template
     * @param string $templateName
     */
    public function applyRegisteredTemplateStuff(MagicTemplate $template,
                                                 string $templateName): void {
        $defs = $this->getRegisteredTemplateAliases($templateName);
        foreach ($defs as $def) $template->registerAlias(...$def);
        $defs = $this->getRegisteredTemplateMethods($templateName);
        foreach ($defs as $def) $template->registerMethod(...$def);
    }
    /**
     * @param \stdClass $file {url: string, attrs: array}
     * @param string $for 'WebsiteLayout'|'ControlPanel'
     */
    public function putJsFile(\stdClass $file, string $for): void {
        $this->jsFiles[$for][] = $file;
    }
    /**
     * @param \stdClass $file {url: string, attrs: array}
     * @param string $for 'WebsiteLayout'|'ControlPanel'
     */
    public function putCssFile(\stdClass $file, string $for): void {
        $this->cssFiles[$for][] = $file;
    }
    /**
     * @param string $for
     * @return \stdClass[] array<{url: string, attrs: array}>
     */
    public function getEnqueuedJsFiles(string $for): array {
        return $this->jsFiles[$for] ?? [];
    }
    /**
     * @param string $for
     * @return \stdClass[] array<{url: string, attrs: array}>
     */
    public function getEnqueuedCssFiles(string $for): array {
        return $this->cssFiles[$for] ?? [];
    }
    /**
     * @param \stdClass $panel {impl: string, title: string}
     */
    public function putAdminPanel(\stdClass $panel): void {
        $this->frontendAdminPanels[] = $panel;
    }
    /**
     * @param \stdClass[] array<{impl: string, title: string}>
     */
    public function getEnqueuedAdminPanels(): array {
        return $this->frontendAdminPanels;
    }
    /**
     * @see \RadCms\Website\WebsiteAPI->registerLayoutForUrlPattern().
     */
    public function putUrlLayout(string $pattern, string $layoutFilePath): void {
        $urlMatcher = new UrlMatcher($pattern, $layoutFilePath);
        if (RAD_FLAGS & RAD_DEVMODE) {
            if (preg_match($urlMatcher->pattern, '') === false) {
                throw new PikeException("{$urlMatcher->pattern} is not valid regexp",
                                        PikeException::BAD_INPUT);
            }
            $filePath = RAD_WORKSPACE_PATH . "site/{$urlMatcher->layoutFileName}";
            if (!$this->fs->isFile($filePath))
                throw new PikeException("Failed to locate layout file `{$filePath}`",
                                        PikeException::BAD_INPUT);
        }
        $this->urlMatchers[] = $urlMatcher;
    }
    /**
     * @return \RadCms\Website\UrlMatcher[]
     */
    public function getRegisteredUrlLayouts(): array {
        return $this->urlMatchers;
    }
    /**
     * @param string $eventName
     * @param callable $fn
     * @return int listener id
     */
    public function addEventListener(string $eventName, callable $fn): int {
        $this->eventListeners[$eventName][] = $fn;
        return count($this->eventListeners[$eventName]) - 1;
    }
    /**
     * @param string $eventName
     * @param mixed[] $args
     */
    public function triggerEvent(string $eventName, ...$args): void {
        foreach ($this->eventListeners[$eventName] ?? [] as $fn)
            call_user_func_array($fn, $args);
    }
    /**
     * @param string $for
     * @return array[] array<[string, string]>
     */
    private function getRegisteredTemplateAliases(string $for): array {
        return array_merge($this->templateAliases['*'] ?? [],
                           $this->templateAliases[$for] ?? []);
    }
    /**
     * @param string $for
     * @return array[] array<[string, callable, bool]>
     */
    private function getRegisteredTemplateMethods(string $for): array {
        return array_merge($this->templateFuncs['*'] ?? [],
                           $this->templateFuncs[$for] ?? []);
    }
}