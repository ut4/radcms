<?php

namespace RadCms;

use Auryn\Injector;
use Pike\Translator;
use Pike\FileSystem;
use Pike\App as PikeApp;
use RadCms\Auth\AuthModule;
use RadCms\Content\ContentModule;
use RadCms\ContentType\ContentTypeModule;
use RadCms\Packager\PackagerModule;
use RadCms\Plugin\PluginModule;
use RadCms\Upload\UploadModule;
use RadCms\Website\WebsiteModule;

class App {
    private static $ctx; // Lainattu \Pike\App:lta
    private static $fs;
    /**
     * @param array $config
     * @param object $ctx = null
     * @return \Pike\App
     * @throws \Pike\PikeException
     */
    public static function create($config, $ctx = null) {
        return PikeApp::create([
            self::class,
            AuthModule::class,
            ContentModule::class,
            ContentTypeModule::class,
            PackagerModule::class,
            PluginModule::class,
            UploadModule::class,
            WebsiteModule::class,
        ], $config, $ctx);
    }
    /**
     * @param \stdClass $ctx
     * @throws \Pike\PikeException
     */
    public static function init(\stdClass $ctx) {
        self::$fs = $ctx->fs ?? new FileSystem(); // translaattorille
        $ctx->state = new AppState($ctx->db, self::$fs);
        // @allow \Pike\PikeException
        $ctx->db->open();
        // @allow \Pike\PikeException
        $ctx->state->selfLoad($ctx->router);
        if (!isset($ctx->translator))
            $ctx->translator = new Translator(function () use ($ctx) {
                $mainLangFilePath = RAD_SITE_PATH . 'translations/' .
                    $ctx->state->websiteState->lang . '.php';
                return self::$fs->isFile($mainLangFilePath) ? include $mainLangFilePath : [];
            });
        self::$ctx = $ctx;
    }
    /**
     * @param \Auryn\Injector $container
     * @throws \Pike\PikeException
     */
    public static function alterIoc(Injector $container) {
        $container->share(self::$ctx->translator);
        $container->share(self::$ctx->state);
        $container->share(self::$ctx->state->plugins);
        $container->share(self::$ctx->state->contentTypes);
    }
}
