<?php

namespace RadCms\Tests;

use RadCms\Tests\Self\DbTestCase;
use RadCms\ContentType\ContentTypeMigrator;
use RadCms\Tests\Self\HttpTestUtils;
use RadCms\Tests\Self\ContentTypeDbTestUtils;
use RadCms\Framework\FileSystem;
use RadCms\Tests\AppTest;
use RadCms\Framework\Request;
use RadCms\Tests\Self\MutedResponse;
use MySite\Plugins\MoviesPlugin\MoviesPlugin;
use RadCms\Plugin\Plugin;
use RadCms\AppState;

final class PluginAPIIntegrationTest extends DbTestCase {
    use HttpTestUtils;
    use ContentTypeDbTestUtils;
    private $testPlugin;
    public function setupTestPlugin($initialData = null) {
        // Tekee suunnilleen saman kuin PUT /api/plugins/MoviesPlugin/install
        $db = self::getDb();
        $this->testPlugin = new Plugin('MoviesPlugin', MoviesPlugin::class);
        $m = new ContentTypeMigrator($db);
        $m->setOrigin($this->testPlugin);
        $moviesPluginImpl = $this->testPlugin->instantiate();
        if ($initialData) $moviesPluginImpl->setTestInitalData($initialData);
        $moviesPluginImpl->install($m);
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
        InstallerTest::clearInstalledContentTypesFromDb();
    }


    ////////////////////////////////////////////////////////////////////////////


    public function testPluginCanInstallContentType() {
        $initialMovies = [['Movies', [(object)['title' => 'Initial movie']]]];
        $s = $this->setupInstallCtypeTest($initialMovies);
        $this->verifyContentTypeWasInstalledToDb();
        $this->verifyInitialDataWasInsertedToDb();
    }
    private function setupInstallCtypeTest($initialMovies = null) {
        $this->setupTestPlugin($initialMovies);
        $ctx = (object)['fs' => $this->createMock(FileSystem::class)];
        $ctx->fs->method('readDir')->willReturn([RAD_SITE_PATH . 'Plugins/MoviesPlugin']);
        return (object) [
            'ctx' => $ctx,
            'expectedResponseBody' => null,
            'testMovieId' => null,
        ];
    }
    private function verifyContentTypeWasInstalledToDb() {
        $this->verifyContentTypeIsInstalled('Movies', true, self::getDb());
    }
    private function verifyInitialDataWasInsertedToDb() {
        $this->verifyMovieWasInsertedToDb('Initial movie');
    }


    ////////////////////////////////////////////////////////////////////////////


    public function testPluginCanCRUDRead() {
        $s = $this->setupReadTest();
        $this->insertTestMovie();
        $this->setExpectedResponseBody('[{"id":"1","title":"Fus"' .
                                         ',"contentType":"Movies"}]', $s);
        $this->sendListMoviesRequest($s);
    }
    private function setupReadTest() {
        return $this->setupInstallCtypeTest();
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
        $s = $this->setupCreateTest();
        $this->setExpectedResponseBody('{"my":"response"}', $s);
        $this->sendInsertMovieRequest($s);
        $this->verifyMovieWasInsertedToDb('A movie');
    }
    private function setupCreateTest() {
        return $this->setupInstallCtypeTest();
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
    private function verifyMovieWasInsertedToDb($title) {
        $this->assertEquals(1, count(self::$db->fetchAll(
            'SELECT `id` FROM ${p}Movies WHERE `title` = ?',
            [$title]
        )));
    }


    ////////////////////////////////////////////////////////////////////////////


    public function testPluginCanCRUDUpdate() {
        $s = $this->setupUpdateTest();
        $this->setExpectedResponseBody('{"my":"response2"}', $s);
        $newTitle = 'Updated';
        $this->sendUpdateMovieRequest($s, $newTitle);
        $this->verifyMovieWasUpdatedToDb($newTitle);
    }
    private function setupUpdateTest() {
        $out = $this->setupInstallCtypeTest();
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
        $s = $this->setupFileRegTest();
        $res = $this->createMock(MutedResponse::class);
        $req = new Request('/noop', 'GET');
        $app = $this->makeRequest($req, $res, $s->ctx);
        $this->verifyJsFilesWereRegistered($app->getCtx()->state);
    }
    private function setupFileRegTest() {
        return $this->setupReadTest();
    }
    private function verifyJsFilesWereRegistered(AppState $state) {
        $this->assertEquals(2, count($state->pluginJsFiles));
        $this->assertEquals([(object)[
            'fileName' => 'file1.js',
            'attrs' => []
        ], (object)[
            'fileName' => 'file2.js',
            'attrs' => ['id' => 'file2']
        ]], $state->pluginJsFiles);
        //
        $this->assertEquals(1, count($state->pluginFrontendAdminPanelInfos));
        $this->assertEquals((object)[
            'impl' => 'MoviesAdmin',
            'title' => 'Elokuvat-app',
        ], $state->pluginFrontendAdminPanelInfos[0]);
    }
}
