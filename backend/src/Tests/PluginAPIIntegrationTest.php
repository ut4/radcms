<?php

namespace RadCms\Tests;

use RadCms\Tests\Self\DbTestCase;
use RadCms\ContentType\ContentTypeMigrator;
use RadCms\Tests\Self\HttpTestUtils;
use RadCms\Framework\FileSystem;
use RadCms\Tests\AppTest;
use RadCms\Framework\Request;
use RadCms\Tests\Self\MutedResponse;
use MySite\Plugins\MoviesPlugin\MoviesPlugin;
use RadCms\Plugin\Plugin;
use RadCms\AppState;

final class PluginAPIIntegrationTest extends DbTestCase {
    use HttpTestUtils;
    private $testPlugin;
    public function setupTestPlugin() {
        // Tekee suunnilleen saman kuin PUT /api/plugins/MoviesPlugin/install
        $db = self::getDb();
        $this->testPlugin = new Plugin('MoviesPlugin', MoviesPlugin::class);
        $m = new ContentTypeMigrator($db);
        $m->setOrigin($this->testPlugin);
        $this->testPlugin->instantiate()->install($m);
        AppTest::markPluginAsInstalled('MoviesPlugin', $db);
    }
    public function tearDown() {
        if ($this->testPlugin) {
            // Tekee suunnilleen saman kuin PUT /api/plugins/MoviesPlugin/uninstall
            $this->testPlugin->impl->uninstall(new ContentTypeMigrator(self::$db));
            AppTest::markPluginAsUninstalled('MoviesPlugin', self::$db);
        }
    }
    public static function tearDownAfterClass($_ = null) {
        parent::tearDownAfterClass(null);
        self::$db->exec('UPDATE ${p}websiteState SET' .
                        ' `installedContentTypesLastUpdated` = NULL');
    }


    ////////////////////////////////////////////////////////////////////////////


    public function testPluginCanInstallContentType() {
        $this->testPlugin = null;
        $this->assertEquals('todo', '');
    }


    ////////////////////////////////////////////////////////////////////////////


    public function testPluginCanCRUDRead() {
        $s = $this->setupTest1();
        $this->insertTestMovie();
        $this->setExpectedResponseBody('[{"id":"1","title":"Fus"' .
                                         ',"contentType":"Movies"}]', $s);
        $this->sendListMoviesRequest($s);
    }
    private function setupTest1() {
        $this->setupTestPlugin();
        $ctx = (object)['fs' => $this->createMock(FileSystem::class)];
        $ctx->fs->method('readDir')->willReturn([RAD_SITE_PATH . 'Plugins/MoviesPlugin']);
        return (object) [
            'ctx' => $ctx,
            'expectedResponseBody' => null,
            'testMovieId' => null,
        ];
    }
    private function insertTestMovie($id = '1') {
        if (self::$db->exec('INSERT INTO ${p}Movies VALUES (?,\'Fus\')', [$id]) < 1)
            throw new \RuntimeException('Failed to insert test data');
    }
    private function setExpectedResponseBody($expectedJson, $s) {
        $s->expectedResponseBody = $this->callback(
            function ($actualData) use ($expectedJson) {
                return json_encode($actualData) == $expectedJson;
            });
    }
    private function sendListMoviesRequest($s) {
        $res = $this->createMock(MutedResponse::class);
        $res->expects($this->once())
            ->method('json')
            ->with($s->expectedResponseBody)
            ->willReturn($res);
        $req = new Request('/movies', 'GET');
        $this->makeRequest($req, $res, $s->ctx);
    }


    ////////////////////////////////////////////////////////////////////////////


    public function testPluginCanCRUDCreate() {
        $s = $this->setupTest2();
        $this->setExpectedResponseBody('{"my":"response"}', $s);
        $this->sendInsertMovieRequest($s);
        $this->verifyMovieWasInsertedToDb();
    }
    private function setupTest2() {
        return $this->setupTest1();
    }
    private function sendInsertMovieRequest($s) {
        $res = $this->createMock(MutedResponse::class);
        $res->expects($this->once())
            ->method('json')
            ->with($s->expectedResponseBody)
            ->willReturn($res);
        $req = new Request('/movies', 'POST', (object) ['title' => 'A movie']);
        $this->makeRequest($req, $res, $s->ctx);
    }
    private function verifyMovieWasInsertedToDb() {
        $this->assertEquals(1, count(self::$db->fetchAll(
            'SELECT `id` FROM ${p}Movies WHERE `title` = \'A movie\''
        )));
    }


    ////////////////////////////////////////////////////////////////////////////


    public function testPluginCanCRUDUpdate() {
        $s = $this->setupTest3();
        $this->setExpectedResponseBody('{"my":"response2"}', $s);
        $newTitle = 'Updated';
        $this->sendUpdateMovieRequest($s, $newTitle);
        $this->verifyMovieWasUpdatedToDb($newTitle);
    }
    private function setupTest3() {
        $out = $this->setupTest1();
        $out->testMovieId = '10';
        // @allow \RuntimeException
        $this->insertTestMovie($out->testMovieId);
        return $out;
    }
    private function sendUpdateMovieRequest($s, $newTitle) {
        $res = $this->createMock(MutedResponse::class);
        $res->expects($this->once())
            ->method('json')
            ->with($s->expectedResponseBody)
            ->willReturn($res);
        $req = new Request('/movies/' . $s->testMovieId, 'PUT',
                           (object) ['title' => $newTitle]);
        $this->makeRequest($req, $res, $s->ctx);
    }
    private function verifyMovieWasUpdatedToDb($newTitle) {
        $this->assertEquals(1, count(self::$db->fetchAll(
            'SELECT `id` FROM ${p}Movies WHERE `title` = ?',
            [$newTitle]
        )));
    }


    ////////////////////////////////////////////////////////////////////////////


    public function testPluginCanRegisterJsFilesAndAdminPanels() {
        $s = $this->setupTest4();
        $res = $this->createMock(MutedResponse::class);
        $req = new Request('/noop', 'GET');
        $app = $this->makeRequest($req, $res, $s->ctx);
        $this->verifyJsFilesWereRegistered($app->getCtx()->state);
    }
    private function setupTest4() {
        return $this->setupTest1();
    }
    private function verifyJsFilesWereRegistered(AppState $appState) {
        $this->assertEquals(2, count($appState->pluginJsFiles));
        $this->assertEquals([(object)[
            'fileName' => 'file1.js',
            'attrs' => []
        ], (object)[
            'fileName' => 'file2.js',
            'attrs' => ['id' => 'file2']
        ]], $appState->pluginJsFiles);
        //
        $this->assertEquals(1, count($appState->pluginFrontendAdminPanelInfos));
        $this->assertEquals((object)[
            'impl' => 'MoviesAdmin',
            'title' => 'Elokuvat-app',
        ], $appState->pluginFrontendAdminPanelInfos[0]);
    }
}
