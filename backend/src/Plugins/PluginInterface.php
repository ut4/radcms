<?php

namespace RadCms\Plugins;

interface PluginInterface {
    /**
     * @param object $ctx
     */
    public function init($ctx);
}
