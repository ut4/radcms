<?php

namespace RadCms\Plugin;

use RadCms\Request;
use RadCms\Response;
use RadCms\Framework\GenericArray;

/**
 * Handlaa /api/plugin -alkuiset pyynnöt.
 */
class PluginControllers {
    private $pluginCollection;
    /**
     * @param \RadCms\Framework\GenericArray $plugins Array<\RadCms\Plugin\PluginInterface>
     */
    public function __construct(GenericArray $pluginCollection) {
        $this->pluginCollection = $pluginCollection;
    }
    /**
     * GET /api/plugins: listaa kaikki lisäosat.
     *
     * @param Request $request
     * @param Response $response
     */
    public function handleGetPluginsRequest(Request $req, Response $res) {
        $res->type('json')->send(array_map(function ($plugin) {
            return ['name' => $plugin->name, 'isInstalled' => $plugin->isInstalled];
        }, $this->pluginCollection->toArray()));
    }
}
