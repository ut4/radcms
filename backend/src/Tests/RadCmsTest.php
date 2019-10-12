<?php

namespace Rad\Tests;

use RadCms\RadCms;
use PHPUnit\Framework\TestCase;
use RadCms\Common\FileSystem;
use RadCms\Tests\_ValidPlugin\_ValidPlugin;

final class RadCmsTest extends TestCase {
    public function testCreateAppScansPluginsFromDisk() {
        $config = [];
        $testPluginDir = 'Tests';
        $mockFs = $this->createMock(FileSystem::class);
        $mockFs->expects($this->once())
            ->method('readDir')
            ->with(RAD_BASE_PATH . 'src/' . $testPluginDir)
            ->willReturn([]);
        RadCms::create($config, $testPluginDir, $mockFs, function () { return null; });
    }
    public function testCreateAppValidatesFoundPlugins() {
        $runInvalid = function ($invalidClsPath, $expectedError) {
            try {
                $config = [];
                $mockFs = $this->createMock(FileSystem::class);
                $mockFs->expects($this->once())
                    ->method('readDir')
                    ->willReturn(['foo/bar/baz/Tests/' . $invalidClsPath]);
                RadCms::create($config, 'Tests', $mockFs, function () { return null; });
            } catch (\RuntimeException $e) {
                $this->assertEquals($expectedError, $e->getMessage());
            }
        };
        $runInvalid('NoMainFilePlugin',
            'Main plugin class "RadCms\Tests\NoMainFilePlugin\NoMainFilePlugin" missing'
        );
        $runInvalid('_InvalidPlugin',
            'A plugin ("RadCms\Tests\_InvalidPlugin\_InvalidPlugin") must implement' .
            ' RadCms\Plugins\PluginInterface'
        );
    }
    public function testCreateAppInitializesValidPlugins() {
        $config = [];
        $mockFs = $this->createMock(FileSystem::class);
        $mockFs->expects($this->once())
            ->method('readDir')
            ->willReturn(['foo/bar/baz/Tests/_ValidPlugin']);
        $this->assertEquals(false, _ValidPlugin::$initialized);
        RadCms::create($config, 'Tests', $mockFs, function () { return null; });
        $this->assertEquals(true, _ValidPlugin::$initialized);
    }
}
