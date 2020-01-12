<?php

namespace RadCms\Plugin;

use Pike\GenericArray;

class PluginCollection extends GenericArray {
    /**
     * .
     */
    public function __construct() {
        parent::__construct(Plugin::class);
    }
}
