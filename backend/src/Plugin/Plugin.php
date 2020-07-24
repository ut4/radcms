<?php

declare(strict_types=1);

namespace RadCms\Plugin;

use Pike\PikeException;

class Plugin {
    /** @var string */
    public $name;
    /** @var bool */
    public $isInstalled;
    /** @var ?\RadCms\Plugin\PluginInterface */
    private $instance;
    /**
     * @param string $name "PluginName.php" minus ".php"
     */
    public function __construct(string $name) {
        $this->name = $name;
        $this->isInstalled = false;
    }
    /**
     * @return \RadCms\Plugin\PluginInterface
     * @throws \Pike\PikeException
     */
    public function instantiate(): PluginInterface {
        $Ctor = "RadPlugins\\{$this->name}\\{$this->name}";
        if (!class_exists($Ctor))
            throw new PikeException("Main plugin class \"{$Ctor}\" missing",
                                    PikeException::BAD_INPUT);
        if (!array_key_exists(PluginInterface::class, class_implements($Ctor, false)))
            throw new PikeException("A plugin (\"{$Ctor}\") must implement RadCms\Plugin\PluginInterface",
                                    PikeException::BAD_INPUT);
        $this->instance = new $Ctor();
        return $this->instance;
    }
    /**
     * @return \RadCms\Plugin\PluginInterface|null
     */
    public function getInstance(): ?PluginInterface {
        return $this->instance;
    }
}
