<?php

namespace RadCms;

use Pike\ArrayUtils;

/**
 * Site.php-luokissa, teemoissa ja lisäosissa käytettävä luokka.
 */
class BaseAPI {
    public const TARGET_WEBSITE_LAYOUT = 'WebsiteLayout';
    public const TARGET_CONTROL_PANEL_LAYOUT = 'ControlPanelLayout';
    public const TARGET_ALL = '*';
    public const ON_PAGE_LOADED = 'pageLoaded'; // (bool $isControlPanelPageLoad, \Pike\Request $req)
    protected $configsStorage;
    protected $plugins;
    /**
     * @param \RadCms\APIConfigsStorage $apiState
     */
    public function __construct(APIConfigsStorage $apiState, \ArrayObject $plugins) {
        $this->configsStorage = $apiState;
        $this->plugins = $plugins;
    }
    /**
     * Rekisteröi <?= $this->DirectiveName(...) ?> käytettäväksi templaatteista.
     * Esimerkki: registerDirective('Movies', RAD_PUBLIC_PATH . 'plugins/Foo/movies.inc');
     *
     * @param string $directiveName
     * @param string $fullFilePath
     * @param string $for = '*' '*'|'WebsiteLayout'|'path-of-the-file.tmpl.php'
     * @throws \Pike\PikeException
     */
    public function registerDirective($directiveName, $fullFilePath, $for = '*') {
        // @allow \Pike\PikeException
        $this->configsStorage->putTemplateAlias($directiveName, $fullFilePath, $for);
    }
    /**
     * Rekisteröi <?php $this->methodName(...) ?> käytettäväksi templaatteista.
     *
     * @param string $methodName
     * @param \Closure|callable $fn
     * @param string $for = '*' '*'|'WebsiteLayout'|'path-of-the-file.tmpl.php'
     * @param bool $bindToDirectiveScope = false
     * @throws \Pike\PikeException
     */
    public function registerDirectiveMethod($methodName,
                                            callable $fn,
                                            $for = '*',
                                            $bindToDirectiveScope = false) {
        // @allow \Pike\PikeException
        $this->configsStorage->putTemplateMethod($methodName,
                                                 $fn,
                                                 $bindToDirectiveScope,
                                                 $for);
    }
    /**
     * Rekisteröi <script src="<?= $scriptFileName ?>"> sisällytettäväksi
     * cpanel.php-tiedostoon. Esimerkki: enqueueAdminJsFile('my-file.js', ['type' => 'module']);
     *
     * @param string $scriptFileName
     * @param array $attrs = array
     */
    public function enqueueAdminJsFile($scriptFileName, array $attrs = []) {
        $this->configsStorage->putJsFile((object)[
            'url' => $scriptFileName,
            'attrs' => $attrs,
        ], self::TARGET_CONTROL_PANEL_LAYOUT);
    }
    /**
     * @param string $name
     * @param bool $onlyInstalled = true
     * @return \RadCms\Plugin\Plugin|null
     */
    public function getPlugin($name, $onlyInstalled = true) {
        $plugin = ArrayUtils::findByKey($this->plugins, $name, 'name');
        if (!$plugin) return null;
        return !$onlyInstalled || $plugin->isInstalled ? $plugin : null;
    }
    /**
     * @param string $eventName
     * @param callable $fn
     * @return int listener id
     */
    public function on(string $eventName, callable $fn) {
        return $this->configsStorage->addEventListener($eventName, $fn);
    }
}
