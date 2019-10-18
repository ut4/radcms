<?php

namespace RadCms\Plugin;

interface PluginInterface {
    /**
     * @param object $ctx
     */
    public function init($ctx);
}
