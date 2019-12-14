<?php

namespace RadCms\Plugin;

use Pike\Request;
use Pike\Response;
use RadCms\Common\LoggerAccess;
use Pike\PikeException;

/**
 * Handlaa /api/plugin -alkuiset pyynnöt.
 */
class PluginControllers {
    private $plugins;
    /**
     * @param \RadCms\Plugin\PluginCollection $plugins
     */
    public function __construct(PluginCollection $plugins) {
        $this->plugins = $plugins;
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
        }, $this->plugins->toArray()));
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
        if (($plugin = $this->plugins->find($req->params->name))) {
            try {
                if ($installer->install($plugin)) {
                    $res->json(['ok' => 'ok']);
                    return;
                }
            } catch (PikeException $e) {
                LoggerAccess::getLogger()->log('error', $e->getTraceAsString());
                $errorMessage = 'Failed to install a plugin (see the logger ' .
                                'output for details).';
            }
        } else {
            $errorMessage = "Plugin `{$req->params->name}` not found.";
        }
        $res->status(500)->json(['error' => $errorMessage]);
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
        if (($plugin = $this->plugins->find($req->params->name))) {
            try {
                if ($installer->uninstall($plugin)) {
                    $res->json(['ok' => 'ok']);
                    return;
                }
            } catch (PikeException $e) {
                LoggerAccess::getLogger()->log('error', $e->getTraceAsString());
                $errorMessage = 'Failed to uninstall a plugin (see the logger ' .
                                'output for details).';
            }
        } else {
            $errorMessage = "Plugin `{$req->params->name}` not found.";
        }
        $res->status(500)->json(['error' => $errorMessage]);
    }
}
