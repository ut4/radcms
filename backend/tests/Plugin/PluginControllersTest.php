<?php

namespace RadCms\Tests\Plugin;

use Pike\{FileSystem, Request};
use Pike\TestUtils\{DbTestCase, HttpTestUtils};
use RadCms\AppContext;
use RadCms\Tests\AppTest;
use RadPlugins\ValidAndInstalledPlugin\ValidAndInstalledPlugin;
use RadPlugins\ValidPlugin\ValidPlugin;

final class PluginControllersTest extends DbTestCase {
    use HttpTestUtils;
    private $afterTest;
    protected function setUp(): void {
        parent::setUp();
    }
    protected function tearDown(): void {
        parent::tearDown();
        $this->afterTest->__invoke();
    }
    public function testPUTInstallInstallsPluginAndRegistersItToDatabase() {
        $s = $this->setupInstallTest();
        $this->sendInstallPluginRequest($s);
        $this->verifyCalledPluginImplsInstallMethod();
        $this->verifyRegisteredPluginToDb($s);
    }
    private function setupInstallTest($testPluginName = 'ValidPlugin') {
        $s = new \stdClass;
        $s->testPluginName = $testPluginName;
        $s->ctx = new AppContext(['db' => '@auto', 'auth' => '@auto']);
        $s->ctx->fs = $this->createMock(FileSystem::class);
        $s->ctx->fs->expects($this->once())->method('readDir')->willReturn(
            [dirname(RAD_PUBLIC_PATH) . '/_test-plugins/' . $s->testPluginName]);
        $this->afterTest = function () {
            ValidPlugin::$instantiated = false;
            ValidPlugin::$initialized = false;
            ValidPlugin::$installed = false;
            self::$db->exec('UPDATE ${p}cmsState SET `installedPlugins` = \'{}\'');
        };
        $s->app = $this->makeApp('\RadCms\App::create', $this->getAppConfig(),
            $s->ctx);
        return $s;
    }
    private function sendInstallPluginRequest($s) {
        $req = new Request("/api/plugins/{$s->testPluginName}/install", 'PUT');
        $res = $this->createMockResponse(['ok' => 'ok'], 200);
        $this->sendRequest($req, $res, $s->app);
    }
    private function verifyCalledPluginImplsInstallMethod() {
        $this->assertEquals(true, ValidPlugin::$installed);
    }
    private function verifyRegisteredPluginToDb($s) {
        $rows = self::$db->fetchAll('SELECT `installedPlugins` FROM ${p}cmsState');
        $this->assertEquals(1, count($rows));
        $parsed = json_decode($rows[0]['installedPlugins'], true);
        $this->assertEquals(true, array_key_exists($s->testPluginName, $parsed));
    }


    ////////////////////////////////////////////////////////////////////////////


    public function testPUTUninstallUninstallsPluginAndUnregistersItFromDatabase() {
        $s = $this->setupUninstallTest();
        $this->sendUninstallPluginRequest($s);
        $this->verifyCalledPluginImplsUninstallMethod();
        $this->verifyUnregisteredPluginFromDb($s);
    }
    private function setupUninstallTest() {
        AppTest::markPluginAsInstalled('ValidAndInstalledPlugin', self::$db);
        ValidAndInstalledPlugin::$installed = true;
        //
        $s = $this->setupInstallTest('ValidAndInstalledPlugin');
        $this->afterTest = function () {
            ValidAndInstalledPlugin::$instantiated = false;
            ValidAndInstalledPlugin::$initialized = false;
            ValidAndInstalledPlugin::$installed = false;
        };
        return $s;
    }
    private function sendUninstallPluginRequest($s) {
        $req = new Request("/api/plugins/{$s->testPluginName}/uninstall", 'PUT');
        $res = $this->createMockResponse(['ok' => 'ok'], 200);
        $this->sendRequest($req, $res, $s->app);
    }
    private function verifyCalledPluginImplsUninstallMethod() {
        $this->assertEquals(false, ValidAndInstalledPlugin::$installed);
    }
    private function verifyUnregisteredPluginFromDb($s) {
        $rows = self::$db->fetchAll('SELECT `installedPlugins` FROM ${p}cmsState');
        $this->assertEquals(1, count($rows));
        $parsed = json_decode($rows[0]['installedPlugins'], true);
        $this->assertEquals(false, array_key_exists($s->testPluginName, $parsed));
    }
}
