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
    private $afterTest;
    public function tearDown() {
        $this->afterTest->__invoke();
    }
    public function testPUTInstallInstallsPluginAndRegistersItToDatabase() {
        $s = $this->setupTest1();
        //
        $req = new Request("/api/plugins/{$s->testPluginName}/install", 'PUT');
        $this->makeRequest($req, $s->res, $s->mockFs);
        //
        $this->verifyCalledPluginImplsInstallMethod();
        $this->verifyRegisteredPluginToDb($s);
    }
    private function setupTest1() {
        $testPluginName = '_ValidPlugin';
        $mockFs = $this->createMock(FileSystem::class);
        $mockFs->expects($this->once())->method('readDir')->willReturn(
            [RAD_BASE_PATH . 'src/Tests/' . $testPluginName]);
        $this->afterTest = function () {
            _ValidPlugin::$instantiated = false;
            _ValidPlugin::$initialized = false;
            _ValidPlugin::$installed = false;
            if (self::$db->exec('UPDATE ${p}websiteState SET' .
                                ' `installedPlugins` = \'{}\'') < 1)
                throw new \RuntimeException('Failed to clean test data.');
        };
        return (object)[
            'testPluginName' => $testPluginName,
            'res' => $this->createMockResponse(['ok' => 'ok'], 200, 'json'),
            'mockFs' => $mockFs,
        ];
    }
    private function verifyCalledPluginImplsInstallMethod() {
        $this->assertEquals(true, _ValidPlugin::$installed);
    }
    private function verifyRegisteredPluginToDb($s) {
        $rows = self::$db->fetchAll('SELECT `installedPlugins` FROM ${p}websiteState');
        $this->assertEquals(1, count($rows));
        $parsed = json_decode($rows[0]['installedPlugins'], true);
        $this->assertEquals(true, array_key_exists($s->testPluginName, $parsed));
    }


    ////////////////////////////////////////////////////////////////////////////


    public function testPUTUninstallUninstallsPluginAndUnregistersItFromDatabase() {
        $s = $this->setupTest2();
        //
        $req = new Request("/api/plugins/{$s->testPluginName}/uninstall", 'PUT');
        $this->makeRequest($req, $s->res, $s->mockFs);
        //
        $this->verifyCalledPluginImplsUninstallMethod();
        $this->verifyUnregisteredPluginFromDb($s);
    }
    private function setupTest2() {
        $testPluginName = '_ValidAndInstalledPlugin';
        $mockFs = $this->createMock(FileSystem::class);
        $mockFs->expects($this->once())->method('readDir')->willReturn(
            [RAD_BASE_PATH . 'src/Tests/' . $testPluginName]);
        self::$db->exec('UPDATE ${p}websiteState SET `installedPlugins`=' .
                        ' JSON_SET(`installedPlugins`, ?, ?)',
                        ['$."' . $testPluginName . '"', 1]);
        _ValidAndInstalledPlugin::$installed = true;
        $this->afterTest = function () {
            _ValidAndInstalledPlugin::$instantiated = false;
            _ValidAndInstalledPlugin::$initialized = false;
            _ValidAndInstalledPlugin::$installed = false;
        };
        return (object)[
            'testPluginName' => $testPluginName,
            'originalInstallState' => _ValidAndInstalledPlugin::$installed,
            'res' => $this->createMockResponse(['ok' => 'ok'], 200, 'json'),
            'mockFs' => $mockFs,
        ];
    }
    private function verifyCalledPluginImplsUninstallMethod() {
        $this->assertEquals(false, _ValidAndInstalledPlugin::$installed);
    }
    private function verifyUnregisteredPluginFromDb($s) {
        $rows = self::$db->fetchAll('SELECT `installedPlugins` FROM ${p}websiteState');
        $this->assertEquals(1, count($rows));
        $parsed = json_decode($rows[0]['installedPlugins'], true);
        $this->assertEquals(false, array_key_exists($s->testPluginName, $parsed));
    }
}
