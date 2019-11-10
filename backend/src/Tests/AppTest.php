<?php

namespace RadCms\Tests;

use RadCms\App;
use RadCms\Framework\FileSystem;
use RadCms\Tests\Self\DbTestCase;
use MySite\Plugins\ValidAndInstalledPlugin\ValidAndInstalledPlugin;
use MySite\Plugins\ValidPlugin\ValidPlugin;
use RadCms\Tests\Self\CtxExposingApp;

final class AppTest extends DbTestCase {
    public static function setUpBeforeClass() {
        self::$db = self::getDb();
    }
    public function testCreateAppScansPluginsFromDisk() {
        $ctx = (object)['db' => self::$db, 'fs' => $this->createMock(FileSystem::class)];
        $ctx->fs->expects($this->once())
            ->method('readDir')
            ->with(RAD_SITE_PATH . 'Plugins')
            ->willReturn([]);
        App::create($ctx);
    }
    public function testCreateAppValidatesFoundPlugins() {
        $runInvalid = function ($invalidClsPath, $expectedError) {
            try {
                $ctx = (object)['db' => self::$db, 'fs' => $this->createMock(FileSystem::class)];
                $ctx->fs->expects($this->once())
                    ->method('readDir')
                    ->willReturn(['foo/bar/baz/Plugins/' . $invalidClsPath]);
                App::create($ctx);
            } catch (\RuntimeException $e) {
                $this->assertEquals($expectedError, $e->getMessage());
            }
        };
        $runInvalid('NoMainFilePlugin',
            'Main plugin class "MySite\\Plugins\\NoMainFilePlugin\\NoMainFilePlugin" missing'
        );
        $runInvalid('InvalidPlugin',
            'A plugin ("MySite\\Plugins\\InvalidPlugin\\InvalidPlugin") must implement' .
            ' RadCms\\Plugin\\PluginInterface'
        );
    }
    public function testCreateAppInitializesValidAndInstalledPlugins() {
        $pluginDirPath = RAD_SITE_PATH . 'Plugins';
        $ctx = (object)['db' => self::$db, 'fs' => $this->createMock(FileSystem::class)];
        $ctx->fs->expects($this->once())
            ->method('readDir')
            ->with($pluginDirPath)
            ->willReturn(["{$pluginDirPath}/ValidAndInstalledPlugin",
                          "{$pluginDirPath}/ValidPlugin"]);
        self::markPluginAsInstalled('ValidAndInstalledPlugin', self::$db);
        $app = CtxExposingApp::create($ctx);
        $actuallyRegisteredPlugins = $app->getPlugins()->toArray();
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
        if ($db->exec('UPDATE ${p}websiteState SET `installedPlugins`=' .
                      ' JSON_SET(`installedPlugins`, ?, 1)',
                      ['$."' . $pluginName . '"']) < 1)
            throw new \RuntimeException('Failed to setup test data.');
    }
    public static function markPluginAsUninstalled($pluginName, $db) {
        if ($db->exec('UPDATE ${p}websiteState SET `installedPlugins`=' .
                      ' JSON_REMOVE(`installedPlugins`, ?)',
                      ['$."' . $pluginName . '"']) < 1)
            throw new \RuntimeException('Failed to clean test data.');
    }
}
