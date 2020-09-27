<?php

declare(strict_types=1);

namespace RadCms;

use Pike\ArrayUtils;
use RadCms\Plugin\Plugin;

/**
 * Site.php-luokissa, teemoissa ja lisäosissa käytettävä luokka.
 */
class BaseAPI {
    public const TARGET_WEBSITE_LAYOUT = 'WebsiteLayout';
    public const TARGET_CONTROL_PANEL_LAYOUT = 'ControlPanelLayout';
    public const TARGET_ALL = '*';
    public const ON_PAGE_LOADED = 'pageLoaded'; // (bool $isControlPanelPageLoad, \Pike\Request $req)
    /** @var string */
    private $dir;
    /** @var \RadCms\APIConfigsStorage */
    protected $configsStorage;
    /** @var \ArrayObject */
    protected $plugins;
    /**
     * @param string $dir 'site/', tai 'plugins/JokinLisäosa/'
     * @param \RadCms\APIConfigsStorage $apiState
     * @param \ArrayObject $plugins
     */
    public function __construct(string $dir,
                                APIConfigsStorage $apiState,
                                \ArrayObject $plugins) {
        $this->dir = $dir;
        $this->configsStorage = $apiState;
        $this->plugins = $plugins;
    }
    /**
     * Rekisteröi <?= $this->DirectiveName(...) ?> käytettäväksi templaatteista.
     * $relativeFilePath on relatiivinen Site/Theme.php:hen (jos WebsiteAPI tai
     * ThemeAPI), tai lisäosan pääluokkaan LisäOsa/LisäOsa.php (jos PluginAPI)
     * Esimerkki: registerDirective('Movies', 'templates/movies.inc');
     *
     * @param string $directiveName
     * @param string $relativeFilePath
     * @param string $for = '*' '*'|'WebsiteLayout'|'path-of-the-file.tmpl.php'
     * @throws \Pike\PikeException
     */
    public function registerDirective(string $directiveName,
                                      string $relativeFilePath,
                                      string $for = '*'): void {
        // @allow \Pike\PikeException
        $this->configsStorage->putTemplateAlias($directiveName,
                                                $this->dir . $relativeFilePath,
                                                $for);
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
    public function registerDirectiveMethod(string $methodName,
                                            callable $fn,
                                            string $for = '*',
                                            bool $bindToDirectiveScope = false): void {
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
    public function enqueueAdminJsFile(string $scriptFileName,
                                       array $attrs = []): void {
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
    public function getPlugin(string $name,
                              bool $onlyInstalled = true): ?Plugin {
        $plugin = ArrayUtils::findByKey($this->plugins, $name, 'name');
        if (!$plugin) return null;
        return !$onlyInstalled || $plugin->isInstalled ? $plugin : null;
    }
    /**
     * @param string $eventName
     * @param callable $fn
     * @return int listener id
     */
    public function on(string $eventName, callable $fn): int {
        return $this->configsStorage->addEventListener($eventName, $fn);
    }
}
