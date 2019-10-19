<?php

namespace Rad\Tests;

use RadCms\RadCmsApp;
use RadCms\Common\FileSystem;
use RadCms\Tests\Self\DbTestCase;
use RadCms\Tests\_ValidAndInstalledPlugin\_ValidAndInstalledPlugin;
use RadCms\Tests\_ValidPlugin\_ValidPlugin;

final class RadCmsTest extends DbTestCase {
    private $config;
    /**
     * @before
     */
    public function beforeEach() {
        $this->config = include RAD_SITE_PATH . 'config.php';
    }
    public function testCreateAppScansPluginsFromDisk() {
        $testPluginDirName = 'Tests';
        $testPluginDirPath = RAD_BASE_PATH . 'src/' . $testPluginDirName;
        $mockFs = $this->createMock(FileSystem::class);
        $mockFs->expects($this->once())
            ->method('readDir')
            ->with($testPluginDirPath)
            ->willReturn([]);
        RadCmsApp::create($this->config, $testPluginDirName, $mockFs, [get_class(), 'getDb']);
    }
    public function testCreateAppValidatesFoundPlugins() {
        $runInvalid = function ($invalidClsPath, $config, $expectedError) {
            try {
                $mockFs = $this->createMock(FileSystem::class);
                $mockFs->expects($this->once())
                    ->method('readDir')
                    ->willReturn(['foo/bar/baz/Tests/' . $invalidClsPath]);
                RadCmsApp::create($config, 'Tests', $mockFs, [get_class(), 'getDb']);
            } catch (\RuntimeException $e) {
                $this->assertEquals($expectedError, $e->getMessage());
            }
        };
        $configA = $this->config;
        $runInvalid('NoMainFilePlugin', $configA,
            'Main plugin class "RadCms\Tests\NoMainFilePlugin\NoMainFilePlugin" missing'
        );
        $configB = $this->config;
        $runInvalid('_InvalidPlugin', $configB,
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
        $app = RadCmsApp::create($this->config, $testPluginDirName, $mockFs, function ($c) {
            $db = self::getDb($c);
            $db->exec('UPDATE ${p}websiteState SET `installedPlugins`=' .
                      ' JSON_SET(`installedPlugins`, ?, 1)',
                      ['$."_ValidAndInstalledPlugin"']);
            return $db;
        });
        $actuallyRegisteredPlugins = $app->ctx->plugins->toArray();
        $this->assertEquals(2, count($actuallyRegisteredPlugins));
        $this->assertEquals('_ValidAndInstalledPlugin', $actuallyRegisteredPlugins[0]->name);
        $this->assertEquals('_ValidPlugin', $actuallyRegisteredPlugins[1]->name);
        $this->assertEquals(true, $actuallyRegisteredPlugins[0]->isInstalled);
        $this->assertEquals(false, $actuallyRegisteredPlugins[1]->isInstalled);
        $this->assertEquals(true, _ValidAndInstalledPlugin::$instantiated);
        $this->assertEquals(true, _ValidAndInstalledPlugin::$initialized);
        $this->assertEquals(false, _ValidPlugin::$instantiated);
        $this->assertEquals(false, _ValidPlugin::$initialized);
        //
        if (self::$db->exec('UPDATE ${p}websiteState SET `installedPlugins`=' .
                            ' JSON_REMOVE(`installedPlugins`, ?)',
                            ['$."_ValidAndInstalledPlugin"']) < 1)
            throw new \RuntimeException('Failed to clean test data.');
    }
}
