<?php

namespace RadCms\Plugin;

use Pike\PikeException;

class Plugin {
    public $name;
    public $isInstalled;
    /**
     * @param string $name "PluginName.php" minus ".php"
     */
    public function __construct($name) {
        $this->name = $name;
        $this->isInstalled = false;
    }
    /**
     * @return \RadCms\Plugin\PluginInterface
     * @throws \Pike\PikeException
     */
    public function instantiate() {
        $Ctor = "RadPlugins\\{$this->name}\\{$this->name}";
        if (!class_exists($Ctor))
            throw new PikeException("Main plugin class \"{$Ctor}\" missing",
                                    PikeException::BAD_INPUT);
        if (!array_key_exists(PluginInterface::class, class_implements($Ctor, false)))
            throw new PikeException("A plugin (\"{$Ctor}\") must implement RadCms\Plugin\PluginInterface",
                                    PikeException::BAD_INPUT);
        return new $Ctor();
    }
}
