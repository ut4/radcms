<?php

namespace Rad\Tests;

use RadCms\Tests\Self\DbTestCase;
use RadCms\Tests\Self\HttpTestUtils;
use RadCms\Common\FileSystem;
use RadCms\Tests\_ValidPlugin\_ValidPlugin;
use RadCms\Request;

final class PluginControllersTest extends DbTestCase {
    use HttpTestUtils;
    public function testPUTInstallInstallsPluginAndLogsItToDatabase() {
        $s = $this->setupTest1();
        //
        $req = new Request("/api/plugins/{$s->testPluginName}/install", 'PUT');
        $this->makeRequest($req, $s->res, $s->mockFs);
        //
        $this->verifyInstalledPlugin();
        $this->verifyLoggedPluginToDb($s);
        $this->cleanupTest1();
    }
    private function setupTest1() {
        include RAD_SITE_PATH . 'config.php';
        $testPluginName = '_ValidPlugin';
        $mockFs = $this->createMock(FileSystem::class);
        $mockFs->expects($this->once())->method('readDir')->willReturn(
            [RAD_BASE_PATH . 'src/Tests/' . $testPluginName]);
        return (object)[
            'testPluginName' => $testPluginName,
            'res' => $this->createMockResponse(['ok' => 'ok'], 200, 'json'),
            'mockFs' => $mockFs,
        ];
    }
    private function verifyInstalledPlugin() {
        $this->assertEquals(true, _ValidPlugin::$installed);
    }
    private function verifyLoggedPluginToDb($s) {
        $rows = self::$db->fetchAll('select `installedPlugins` from ${p}websiteState');
        $this->assertEquals(1, count($rows));
        $this->assertEquals('["' . $s->testPluginName . '"]', $rows[0]['installedPlugins']);
    }
    private function cleanupTest1() {
        _ValidPlugin::$instantiated = false;
        _ValidPlugin::$initialized = false;
        _ValidPlugin::$installed = false;
        if (self::$db->exec('update ${p}websiteState set `installedPlugins`=\'[]\'') < 1)
            throw new \RuntimeException('Failed to clean test data.');
    }
}
