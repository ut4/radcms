<?php

namespace RadCms;

use Pike\FileSystemInterface;
use Pike\PikeException;
use RadCms\Templating\MagicTemplate;

/**
 * Varastoi \RadCms\BaseAPI & \RadCms\Plugin\API -wräppereissä configuroidut tiedot.
 * Mahdollistaa sen, että api-luokista voi luoda useita instansseja, ja että
 * rekisteröity tieto pysyy niiden ulottumattomissa.
 */
class APIConfigsStorage {
    private $templateAliases;
    private $templateFuncs;
    private $pluginJsFiles;
    private $frontendAdminPanels;
    private $fs;
    /**
     * @param \Pike\FileSystemInterface $fs
     */
    public function __construct(FileSystemInterface $fs) {
        $this->templateAliases = [];
        $this->templateFuncs = [];
        $this->pluginJsFiles = [];
        $this->frontendAdminPanels = [];
        $this->fs = $fs;
    }
    /**
     * @see \RadCms\BaseAPI->registerDirective().
     */
    public function putTemplateAlias($directiveName, $fullFilePath, $for) {
        if (RAD_FLAGS & RAD_DEVMODE) {
            if (array_key_exists($directiveName, $this->getRegisteredTemplateAliases($for)))
                throw new PikeException("Alias `{$directiveName}` is already registered.",
                                        PikeException::BAD_INPUT);
            if (!$this->fs->isFile($fullFilePath))
                throw new PikeException("Failed to locate `{$fullFilePath}`",
                                        PikeException::FAILED_FS_OP);
        }
        $this->templateAliases[$for][$directiveName] = [$directiveName, $fullFilePath];
    }
    /**
     * @see \RadCms\BaseAPI->registerDirectiveMethod().
     */
    public function putTemplateMethod($methodName,
                                      callable $fn,
                                      $bindToDirectiveScope,
                                      $for) {
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
    public function applyRegisteredTemplateStuff(MagicTemplate $template, $templateName) {
        $defs = $this->getRegisteredTemplateAliases($templateName);
        foreach ($defs as $def) $template->registerAlias(...$def);
        $defs = $this->getRegisteredTemplateMethods($templateName);
        foreach ($defs as $def) $template->registerMethod(...$def);
    }
    /**
     * @param \stdClass $file
     */
    public function putPluginJsFile($file) {
        $this->pluginJsFiles[] = $file;
    }
    /**
     * @param \stdClass $info
     */
    public function putAdminPanel($info) {
        $this->frontendAdminPanels[] = $info;
    }
    /**
     * @param \stdClass[]
     */
    public function getRegisteredPluginJsFiles() {
        return $this->pluginJsFiles;
    }
    /**
     * @param \stdClass[]
     */
    public function getRegisteredAdminPanels() {
        return $this->frontendAdminPanels;
    }
    /**
     * @return array[]
     */
    private function getRegisteredTemplateAliases($for) {
        return array_merge($this->templateAliases['*'] ?? [],
                           $this->templateAliases[$for] ?? []);
    }
    /**
     * @return array[]
     */
    private function getRegisteredTemplateMethods($for) {
        return array_merge($this->templateFuncs['*'] ?? [],
                           $this->templateFuncs[$for] ?? []);
    }
}