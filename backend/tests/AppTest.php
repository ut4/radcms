<?php

namespace RadCms\Tests;

use RadCms\App;
use Pike\FileSystem;
use Pike\TestUtils\DbTestCase;
use RadPlugins\ValidAndInstalledPlugin\ValidAndInstalledPlugin;
use RadPlugins\ValidPlugin\ValidPlugin;
use RadCms\AppContext;

final class AppTest extends DbTestCase {
    public function testCreateAppScansPluginsFromDisk() {
        $ctx = new AppContext;
        $ctx->db = self::$db;
        $ctx->fs = $this->createMock(FileSystem::class);
        $ctx->fs->expects($this->once())
            ->method('readDir')
            ->with(RAD_PUBLIC_PATH . 'plugins')
            ->willReturn([]);
        App::create([], $ctx);
    }
    public function testCreateAppValidatesFoundPlugins() {
        $runInvalid = function ($invalidClsPath, $expectedError) {
            try {
                $ctx = new AppContext;
                $ctx->db = self::$db;
                $ctx->fs = $this->createMock(FileSystem::class);
                $ctx->fs->expects($this->once())
                    ->method('readDir')
                    ->willReturn(["foo/bar/baz/plugins/{$invalidClsPath}"]);
                App::create([], $ctx);
            } catch (\RuntimeException $e) {
                $this->assertEquals($expectedError, $e->getMessage());
            }
        };
        $runInvalid('NoMainFilePlugin',
            'Main plugin class "RadPlugins\\NoMainFilePlugin\\NoMainFilePlugin" missing'
        );
        $runInvalid('InvalidPlugin',
            'A plugin ("RadPlugins\\InvalidPlugin\\InvalidPlugin") must implement' .
            ' RadCms\\Plugin\\PluginInterface'
        );
    }
    public function testCreateAppInitializesValidAndInstalledPlugins() {
        $pluginDirPath = RAD_PUBLIC_PATH . 'plugins';
        $ctx = new AppContext;
        $ctx->db = self::$db;
        $ctx->fs = $this->createMock(FileSystem::class);
        $ctx->fs->expects($this->once())
            ->method('readDir')
            ->with($pluginDirPath)
            ->willReturn(["{$pluginDirPath}/ValidAndInstalledPlugin",
                          "{$pluginDirPath}/ValidPlugin"]);
        self::markPluginAsInstalled('ValidAndInstalledPlugin', self::$db);
        App::create([], $ctx);
        $actuallyRegisteredPlugins = $ctx->cmsState->getPlugins();
        $this->assertEquals(2, count($actuallyRegisteredPlugins));
        $this->assertEquals('ValidAndInstalledPlugin', $actuallyRegisteredPlugins[0]->name);
        $this->assertEquals('ValidPlugin', $actuallyRegisteredPlugins[1]->name);
        $this->assertEquals(true, $actuallyRegisteredPlugins[0]->isInstalled);
        $this->assertEquals(false, $actuallyRegisteredPlugins[1]->isInstalled);
        $this->assertEquals(true, ValidAndInstalledPlugin::$instantiated);
        $this->assertEquals(true, ValidAndInstalledPlugin::$initialized);
        $this->assertEquals(false, ValidPlugin::$instantiated);
        $this->assertEquals(false, ValidPlugin::$initialized);
        //
        self::markPluginAsUninstalled('ValidAndInstalledPlugin', self::$db);
    }
    public static function markPluginAsInstalled($pluginName, $db) {
        if ($db->exec('UPDATE ${p}cmsState SET `installedPlugins`=' .
                      ' JSON_SET(`installedPlugins`, ?, 1)',
                      ['$."' . $pluginName . '"']) < 1)
            throw new \RuntimeException('Failed to setup test data.');
    }
    public static function markPluginAsUninstalled($pluginName, $db) {
        if ($db->exec('UPDATE ${p}cmsState SET `installedPlugins`=' .
                      ' JSON_REMOVE(`installedPlugins`, ?)',
                      ['$."' . $pluginName . '"']) < 1)
            throw new \RuntimeException('Failed to clean test data.');
    }
}
