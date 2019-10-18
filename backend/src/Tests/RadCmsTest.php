<?php

namespace Rad\Tests;

use RadCms\RadCms;
use RadCms\Common\FileSystem;
use RadCms\Tests\Self\DbTestCase;
use RadCms\Tests\_ValidAndInstalledPlugin\_ValidAndInstalledPlugin;
use RadCms\Tests\_ValidPlugin\_ValidPlugin;

final class RadCmsTest extends DbTestCase {
    private static $config;
    public static function setUpBeforeClass() {
        include RAD_SITE_PATH . 'config.php';
        self::$config = $config;
    }
    public function testCreateAppScansPluginsFromDisk() {
        $testPluginDirName = 'Tests';
        $testPluginDirPath = RAD_BASE_PATH . 'src/' . $testPluginDirName;
        $mockFs = $this->createMock(FileSystem::class);
        $mockFs->expects($this->once())
            ->method('readDir')
            ->with($testPluginDirPath)
            ->willReturn([]);
        RadCms::create(self::$config, $testPluginDirName, $mockFs, [get_class(), 'getDb']);
    }
    public function testCreateAppValidatesFoundPlugins() {
        $runInvalid = function ($invalidClsPath, $expectedError) {
            try {
                $mockFs = $this->createMock(FileSystem::class);
                $mockFs->expects($this->once())
                    ->method('readDir')
                    ->willReturn(['foo/bar/baz/Tests/' . $invalidClsPath]);
                RadCms::create(self::$config, 'Tests', $mockFs, [get_class(), 'getDb']);
            } catch (\RuntimeException $e) {
                $this->assertEquals($expectedError, $e->getMessage());
            }
        };
        $runInvalid('NoMainFilePlugin',
            'Main plugin class "RadCms\Tests\NoMainFilePlugin\NoMainFilePlugin" missing'
        );
        $runInvalid('_InvalidPlugin',
            'A plugin ("RadCms\Tests\_InvalidPlugin\_InvalidPlugin") must implement' .
            ' RadCms\Plugin\PluginInterface'
        );
    }
    public function testCreateAppInitializesValidAndInstalledPlugins() {
        $testPluginDirName = 'Tests';
        $testPluginDirPath = RAD_BASE_PATH . 'src/' . $testPluginDirName;
        $mockFs = $this->createMock(FileSystem::class);
        $mockFs->expects($this->once())
            ->method('readDir')
            ->with($testPluginDirPath)
            ->willReturn([$testPluginDirPath . '/_ValidAndInstalledPlugin',
                          $testPluginDirPath . '/_ValidPlugin']);
        $app = RadCms::create(self::$config, $testPluginDirName, $mockFs, function ($c) {
            $db = self::getDb($c);
            $db->exec('update ${p}websiteState set `installedPlugins`=' .
                      '\'["_ValidAndInstalledPlugin"]\'');
            return $db;
        });
        $actuallyRegisteredPlugins = $app->services->plugins->toArray();
        $this->assertEquals(2, count($actuallyRegisteredPlugins));
        $this->assertEquals('_ValidAndInstalledPlugin', $actuallyRegisteredPlugins[0]->name);
        $this->assertEquals('_ValidPlugin', $actuallyRegisteredPlugins[1]->name);
        $this->assertEquals(true, $actuallyRegisteredPlugins[0]->isInstalled);
        $this->assertEquals(false, $actuallyRegisteredPlugins[1]->isInstalled);
        $this->assertEquals(true, _ValidAndInstalledPlugin::$instantiated);
        $this->assertEquals(true, _ValidAndInstalledPlugin::$initialized);
        $this->assertEquals(false, _ValidPlugin::$instantiated);
        $this->assertEquals(false, _ValidPlugin::$initialized);
    }
}
