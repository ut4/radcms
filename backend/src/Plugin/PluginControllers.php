<?php

namespace RadCms\Plugin;

use RadCms\Request;
use RadCms\Response;
use RadCms\Common\LoggerAccess;

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
     * @param \RadCms\Request $request
     * @param \RadCms\Response $response
     */
    public function handleGetPluginsRequest(Response $res) {
        $res->type('json')->send(array_map(function ($plugin) {
            return ['name' => $plugin->name, 'isInstalled' => $plugin->isInstalled];
        }, $this->plugins->toArray()));
    }
    /**
     * GET /api/plugins/:name/install: asentaa lisäosan $name.
     *
     * @param \RadCms\Request $request
     * @param \RadCms\Response $response
     * @param \RadCms\PluginInstaller $installer
     */
    public function handleInstallPluginRequest(Request $req,
                                               Response $res,
                                               PluginInstaller $installer) {
        if (($plugin = $this->plugins->find('name', $req->params->name))) {
            try {
                $errorMessage = $installer->install($plugin);
                if (!$errorMessage) {
                    $res->type('json')->send(['ok' => 'ok']);
                    return;
                }
            } catch (\Exception $e) {
                LoggerAccess::getLogger('error', $e->getTraceAsString());
                $errorMessage = 'Failed to install a plugin (see the logger ' .
                                'output for details).';
            }
        } else {
            $errorMessage = "Plugin `{$req->params->name}` not found.";
        }
        $res->type('json')->status(500)->send(['error' => $errorMessage]);
    }
    /**
     * GET /api/plugins/:name/uninstall: poistaa lisäosan $name.
     *
     * @param \RadCms\Request $request
     * @param \RadCms\Response $response
     * @param \RadCms\PluginInstaller $installer
     */
    public function handleUninstallPluginRequest(Request $req,
                                                 Response $res,
                                                 PluginInstaller $installer) {
        if (($plugin = $this->plugins->find('name', $req->params->name))) {
            try {
                $errorMessage = $installer->uninstall($plugin);
                if (!$errorMessage) {
                    $res->type('json')->send(['ok' => 'ok']);
                    return;
                }
            } catch (\Exception $e) {
                LoggerAccess::getLogger('error', $e->getTraceAsString());
                $errorMessage = 'Failed to uninstall a plugin (see the logger ' .
                                'output for details).';
            }
        } else {
            $errorMessage = "Plugin `{$req->params->name}` not found.";
        }
        $res->type('json')->status(500)->send(['error' => $errorMessage]);
    }
}
