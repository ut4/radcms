<?php

namespace RadCms\Tests;

use RadCms\Tests\Self\DbTestCase;
use RadCms\Tests\Self\HttpTestUtils;
use RadCms\Framework\FileSystem;
use RadCms\Tests\_ValidPlugin\_ValidPlugin;
use RadCms\Tests\_ValidAndInstalledPlugin\_ValidAndInstalledPlugin;
use RadCms\Framework\Request;

final class PluginControllersTest extends DbTestCase {
    use HttpTestUtils;
    public function testPUTInstallInstallsPluginAndRegistersItToDatabase() {
        $s = $this->setupTest1();
        //
        $req = new Request("/api/plugins/{$s->testPluginName}/install", 'PUT');
        $this->makeRequest($req, $s->res, $s->mockFs);
        //
        $this->verifyInstalledPlugin();
        $this->verifyRegisteredPluginToDb($s);
        $this->cleanupTest1($s);
    }
    private function setupTest1() {
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
    private function verifyRegisteredPluginToDb($s) {
        $rows = self::$db->fetchAll('SELECT `installedPlugins` FROM ${p}websiteState');
        $this->assertEquals(1, count($rows));
        $parsed = json_decode($rows[0]['installedPlugins'], true);
        $this->assertEquals(true, array_key_exists($s->testPluginName, $parsed));
    }
    private function cleanupTest1($s) {
        _ValidPlugin::$instantiated = false;
        _ValidPlugin::$initialized = false;
        _ValidPlugin::$installed = false;
        if (self::$db->exec('UPDATE ${p}websiteState SET `installedPlugins`=' .
                            ' JSON_REMOVE(`installedPlugins`, ?)',
                            ['$."' . $s->testPluginName . '"']) < 1)
            throw new \RuntimeException('Failed to clean test data.');
    }


    ////////////////////////////////////////////////////////////////////////////


    public function testPUTUninstallUninstallsPluginAndUnregistersItFromDatabase() {
        $s = $this->setupTest2();
        //
        $req = new Request("/api/plugins/{$s->testPluginName}/uninstall", 'PUT');
        $this->makeRequest($req, $s->res, $s->mockFs, $s->makeDb);
        //
        $this->verifyUninstalledPlugin();
        $this->verifyUnregisteredPluginFromDb($s);
        $this->cleanupTest2();
    }
    private function setupTest2() {
        $testPluginName = '_ValidAndInstalledPlugin';
        $mockFs = $this->createMock(FileSystem::class);
        $mockFs->expects($this->once())->method('readDir')->willReturn(
            [RAD_BASE_PATH . 'src/Tests/' . $testPluginName]);
        $makeDb = function ($c) use ($testPluginName) {
            $db = self::getDb($c);
            $db->exec('UPDATE ${p}websiteState SET `installedPlugins`=' .
                      ' JSON_SET(`installedPlugins`, ?, ?)',
                      ['$."' . $testPluginName . '"', 1]);
            return $db;
        };
        _ValidAndInstalledPlugin::$installed = true;
        return (object)[
            'testPluginName' => $testPluginName,
            'originalInstallState' => _ValidAndInstalledPlugin::$installed,
            'res' => $this->createMockResponse(['ok' => 'ok'], 200, 'json'),
            'mockFs' => $mockFs,
            'makeDb' => $makeDb
        ];
    }
    private function verifyUninstalledPlugin() {
        $this->assertEquals(false, _ValidAndInstalledPlugin::$installed);
    }
    private function verifyUnregisteredPluginFromDb($s) {
        $rows = self::$db->fetchAll('SELECT `installedPlugins` FROM ${p}websiteState');
        $this->assertEquals(1, count($rows));
        $parsed = json_decode($rows[0]['installedPlugins'], true);
        $this->assertEquals(false, array_key_exists($s->testPluginName, $parsed));
    }
    private function cleanupTest2() {
        _ValidAndInstalledPlugin::$instantiated = false;
        _ValidAndInstalledPlugin::$initialized = false;
        _ValidAndInstalledPlugin::$installed = false;
    }
}
