<?php

namespace RadCms\Plugin;

use Pike\Request;
use Pike\Response;
use Pike\PikeException;
use RadCms\CmsState;
use Pike\ArrayUtils;

/**
 * Handlaa /api/plugin -alkuiset pyynnöt.
 */
class PluginControllers {
    private $plugins;
    /**
     * @param \RadCms\CmsState $cmsState
     */
    public function __construct(CmsState $cmsState) {
        $this->plugins = $cmsState->getPlugins();
    }
    /**
     * GET /api/plugins: listaa kaikki lisäosat.
     *
     * @param \Pike\Request $request
     * @param \Pike\Response $response
     */
    public function handleGetPluginsRequest(Response $res) {
        $res->json(array_map(function ($plugin) {
            return ['name' => $plugin->name, 'isInstalled' => $plugin->isInstalled];
        }, $this->plugins->getArrayCopy()));
    }
    /**
     * PUT /api/plugins/:name/install: asentaa lisäosan $name.
     *
     * @param \Pike\Request $request
     * @param \Pike\Response $response
     * @param \RadCms\PluginInstaller $installer
     */
    public function handleInstallPluginRequest(Request $req,
                                               Response $res,
                                               PluginInstaller $installer) {
        if (($plugin = ArrayUtils::findByKey($this->plugins, $req->params->name, 'name'))) {
            // @allow \Pike\PikeException
            $installer->install($plugin);
            $res->json(['ok' => 'ok']);
        } else {
            throw new PikeException("Plugin `{$req->params->name}` not found.",
                                    PikeException::BAD_INPUT);
        }
    }
    /**
     * PUT /api/plugins/:name/uninstall: poistaa lisäosan $name.
     *
     * @param \Pike\Request $request
     * @param \Pike\Response $response
     * @param \RadCms\PluginInstaller $installer
     */
    public function handleUninstallPluginRequest(Request $req,
                                                 Response $res,
                                                 PluginInstaller $installer) {
        if (($plugin = ArrayUtils::findByKey($this->plugins, $req->params->name, 'name'))) {
            // @allow \Pike\PikeException
            $installer->uninstall($plugin);
            $res->json(['ok' => 'ok']);
        } else {
            throw new PikeException("Plugin `{$req->params->name}` not found.",
                                    PikeException::BAD_INPUT);
        }
    }
}
