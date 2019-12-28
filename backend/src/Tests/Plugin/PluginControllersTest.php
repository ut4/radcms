<?php

namespace RadCms\Tests\Plugin;

use Pike\TestUtils\DbTestCase;
use Pike\TestUtils\HttpTestUtils;
use Pike\FileSystem;
use MySite\Plugins\ValidPlugin\ValidPlugin;
use MySite\Plugins\ValidAndInstalledPlugin\ValidAndInstalledPlugin;
use Pike\Request;

final class PluginControllersTest extends DbTestCase {
    use HttpTestUtils;
    private $afterTest;
    public function tearDown() {
        $this->afterTest->__invoke();
    }
    public function testPUTInstallInstallsPluginAndRegistersItToDatabase() {
        $s = $this->setupInstallTest();
        //
        $req = new Request("/api/plugins/{$s->testPluginName}/install", 'PUT');
        $this->sendRequest($req, $s->res, '\RadCms\App::create', $s->ctx);
        //
        $this->verifyCalledPluginImplsInstallMethod();
        $this->verifyRegisteredPluginToDb($s);
    }
    private function setupInstallTest() {
        $testPluginName = 'ValidPlugin';
        $ctx = (object)['fs' => $this->createMock(FileSystem::class)];
        $ctx->fs->expects($this->once())->method('readDir')->willReturn(
            [dirname(RAD_SITE_PATH) . '/_test-plugins/' . $testPluginName]);
        $this->afterTest = function () {
            ValidPlugin::$instantiated = false;
            ValidPlugin::$initialized = false;
            ValidPlugin::$installed = false;
            if (self::$db->exec('UPDATE ${p}websiteState SET' .
                                ' `installedPlugins` = \'{}\'') < 1)
                throw new \RuntimeException('Failed to clean test data.');
        };
        return (object)[
            'testPluginName' => $testPluginName,
            'res' => $this->createMockResponse(['ok' => 'ok'], 200),
            'ctx' => $ctx,
        ];
    }
    private function verifyCalledPluginImplsInstallMethod() {
        $this->assertEquals(true, ValidPlugin::$installed);
    }
    private function verifyRegisteredPluginToDb($s) {
        $rows = self::$db->fetchAll('SELECT `installedPlugins` FROM ${p}websiteState');
        $this->assertEquals(1, count($rows));
        $parsed = json_decode($rows[0]['installedPlugins'], true);
        $this->assertEquals(true, array_key_exists($s->testPluginName, $parsed));
    }


    ////////////////////////////////////////////////////////////////////////////


    public function testPUTUninstallUninstallsPluginAndUnregistersItFromDatabase() {
        $s = $this->setupUninstallTest();
        //
        $req = new Request("/api/plugins/{$s->testPluginName}/uninstall", 'PUT');
        $this->sendRequest($req, $s->res, '\RadCms\App::create', $s->ctx);
        //
        $this->verifyCalledPluginImplsUninstallMethod();
        $this->verifyUnregisteredPluginFromDb($s);
    }
    private function setupUninstallTest() {
        $testPluginName = 'ValidAndInstalledPlugin';
        $ctx = (object)['fs' => $this->createMock(FileSystem::class)];
        $ctx->fs->expects($this->once())->method('readDir')->willReturn(
            [dirname(RAD_SITE_PATH) . '/_test-plugins/' . $testPluginName]);
        self::$db->exec('UPDATE ${p}websiteState SET `installedPlugins`=' .
                        ' JSON_SET(`installedPlugins`, ?, ?)',
                        ['$."' . $testPluginName . '"', 1]);
        ValidAndInstalledPlugin::$installed = true;
        $this->afterTest = function () {
            ValidAndInstalledPlugin::$instantiated = false;
            ValidAndInstalledPlugin::$initialized = false;
            ValidAndInstalledPlugin::$installed = false;
        };
        return (object)[
            'testPluginName' => $testPluginName,
            'originalInstallState' => ValidAndInstalledPlugin::$installed,
            'res' => $this->createMockResponse(['ok' => 'ok'], 200),
            'ctx' => $ctx,
        ];
    }
    private function verifyCalledPluginImplsUninstallMethod() {
        $this->assertEquals(false, ValidAndInstalledPlugin::$installed);
    }
    private function verifyUnregisteredPluginFromDb($s) {
        $rows = self::$db->fetchAll('SELECT `installedPlugins` FROM ${p}websiteState');
        $this->assertEquals(1, count($rows));
        $parsed = json_decode($rows[0]['installedPlugins'], true);
        $this->assertEquals(false, array_key_exists($s->testPluginName, $parsed));
    }
}
