<?php

namespace RadCms\Plugin;

class Plugin {
    public $impl;
    public $name;
    public $classPath;
    public $isInstalled;
    /**
     * @param string $name
     * @param string $classPath <base>/Plugins/<PluginName>/<PluginName>.php
     */
    public function __construct($name, $classPath) {
        $this->impl = null;
        $this->name = $name;
        $this->classPath = $classPath;
        $this->isInstalled = false;
    }
    /**
     * @return \RadCms\Plugin\PluginInterface
     */
    public function instantiate() {
        $Ctor = $this->classPath;
        $this->impl = new $Ctor();
        return $this->impl;
    }
}
