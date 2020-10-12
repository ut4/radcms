<?php

namespace RadCms\Tests\Plugin;

use Pike\FileSystem;
use Pike\TestUtils\{DbTestCase, HttpTestUtils};
use RadCms\AppContext;
use RadCms\Tests\_Internal\ApiRequestFactory;
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
        $state = $this->setupInstallTest();
        $this->sendInstallPluginRequest($state);
        $this->verifyResponseMetaEquals(200, 'application/json', $state->spyingResponse);
        $this->verifyResponseBodyEquals(['ok' => 'ok'], $state->spyingResponse);
        $this->verifyCalledPluginImplsInstallMethod();
        $this->verifyRegisteredPluginToDb($state);
    }
    private function setupInstallTest($testPluginName = 'ValidPlugin') {
        $state = new \stdClass;
        $state->testPluginName = $testPluginName;
        $state->ctx = new AppContext(['db' => '@auto', 'auth' => '@auto']);
        $state->ctx->fs = $this->createMock(FileSystem::class);
        $state->ctx->fs->expects($this->once())->method('readDir')->willReturn(
            [RAD_BACKEND_PATH . "_test-plugins/{$state->testPluginName}"]);
        $this->afterTest = function () {
            ValidPlugin::$instantiated = false;
            ValidPlugin::$initialized = false;
            ValidPlugin::$installed = false;
            self::$db->exec('UPDATE ${p}cmsState SET `installedPlugins` = \'{}\'');
        };
        $state->app = $this->makeApp('\RadCms\App::create', $this->getAppConfig(),
            $state->ctx);
        $state->spyingResponse = null;
        return $state;
    }
    private function sendInstallPluginRequest($s) {
        $req = ApiRequestFactory::create("/api/plugins/{$s->testPluginName}/install", 'PUT');
        $s->spyingResponse = $this->makeSpyingResponse();
        $this->sendRequest($req, $s->spyingResponse, $s->app);
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
        $state = $this->setupUninstallTest();
        $this->sendUninstallPluginRequest($state);
        $this->verifyResponseMetaEquals(200, 'application/json', $state->spyingResponse);
        $this->verifyResponseBodyEquals(['ok' => 'ok'], $state->spyingResponse);
        $this->verifyCalledPluginImplsUninstallMethod();
        $this->verifyUnregisteredPluginFromDb($state);
    }
    private function setupUninstallTest() {
        AppTest::markPluginAsInstalled('ValidAndInstalledPlugin', self::$db);
        ValidAndInstalledPlugin::$installed = true;
        //
        $state = $this->setupInstallTest('ValidAndInstalledPlugin');
        $this->afterTest = function () {
            ValidAndInstalledPlugin::$instantiated = false;
            ValidAndInstalledPlugin::$initialized = false;
            ValidAndInstalledPlugin::$installed = false;
        };
        return $state;
    }
    private function sendUninstallPluginRequest($s) {
        $req = ApiRequestFactory::create("/api/plugins/{$s->testPluginName}/uninstall", 'PUT');
        $s->spyingResponse = $this->makeSpyingResponse();
        $this->sendRequest($req, $s->spyingResponse, $s->app);
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
