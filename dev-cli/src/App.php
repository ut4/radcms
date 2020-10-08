<?php

declare(strict_types=1);

namespace RadCms\Cli;

use Pike\App as PikeApp;
use RadCms\AppContext;

abstract class App {
    /**
     * @param array $config
     * @param \Pike\AppContext $ctx
     * @param callable $makeInjector = null fn(): \Auryn\Injector
     * @return \Pike\App
     * @throws \Pike\PikeException
     */
    public static function create($config,
                                  AppContext $ctx,
                                  callable $makeInjector = null): PikeApp {
        return PikeApp::create([
            Module::class
        ], $config, $ctx, $makeInjector);
    }
}
