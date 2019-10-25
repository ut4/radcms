<?php

namespace RadCms\Tests;

use RadCms\App;
use RadCms\Framework\FileSystem;
use RadCms\Tests\Self\DbTestCase;
use RadCms\Tests\_ValidAndInstalledPlugin\_ValidAndInstalledPlugin;
use RadCms\Tests\_ValidPlugin\_ValidPlugin;

final class AppTest extends DbTestCase {
    /**
     * @beforeClass
     */
    public static function beforeClass() {
        self::$db = self::getDb(include RAD_SITE_PATH . 'config.php');
    }
    public function testCreateAppScansPluginsFromDisk() {
        $testPluginDirName = 'Tests';
        $testPluginDirPath = RAD_BASE_PATH . 'src/' . $testPluginDirName;
        $mockFs = $this->createMock(FileSystem::class);
        $mockFs->expects($this->once())
            ->method('readDir')
            ->with($testPluginDirPath)
            ->willReturn([]);
        App::create(self::$db, $mockFs, $testPluginDirName);
    }
    public function testCreateAppValidatesFoundPlugins() {
        $runInvalid = function ($invalidClsPath, $expectedError) {
            try {
                $mockFs = $this->createMock(FileSystem::class);
                $mockFs->expects($this->once())
                    ->method('readDir')
                    ->willReturn(['foo/bar/baz/Tests/' . $invalidClsPath]);
                App::create(self::$db, $mockFs, 'Tests');
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
        self::markPluginAsInstalled('_ValidAndInstalledPlugin', self::$db);
        $app = App::create(self::$db, $mockFs, $testPluginDirName);
        $actuallyRegisteredPlugins = $app->plugins->toArray();
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
        self::markPluginAsUninstalled('_ValidAndInstalledPlugin', self::$db);
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