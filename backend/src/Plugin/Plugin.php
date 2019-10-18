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
     * @param \RadCms\Plugin\PluginInterface $impl
     */
    public function setImpl(PluginInterface $impl) {
        $this->impl = $impl;
    }
}
