<?php

namespace RadCms\Plugin;

use RadCms\Framework\GenericArray;

class PluginCollection extends GenericArray {
    /**
     * .
     */
    public function __construct() {
        parent::__construct(Plugin::class);
    }
}
