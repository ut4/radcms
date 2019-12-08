<?php

namespace RadCms\Tests\Plugin;

use RadCms\Tests\_Internal\DbTestCase;
use RadCms\Tests\_Internal\HttpTestUtils;
use RadCms\Tests\_Internal\ContentTestUtils;
use RadCms\Tests\Installer\InstallerTest;
use RadCms\ContentType\ContentTypeMigrator;
use RadCms\Framework\FileSystem;
use RadCms\Tests\AppTest;
use RadCms\Framework\Request;
use RadCms\Tests\_Internal\MutedResponse;
use MySite\Plugins\MoviesPlugin\MoviesPlugin;
use RadCms\Plugin\Plugin;
use RadCms\AppState;

final class PluginAPIIntegrationTest extends DbTestCase {
    use HttpTestUtils;
    use ContentTestUtils;
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
            'actualResponseBody' => null,
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
        $this->sendListMoviesRequest($s);
        $this->verifyResponseBodyEquals('[{"id":"1"' .
                                        ',"isPublished":true' .
                                        ',"title":"Fus"' .
                                        ',"contentType":"Movies"' .
                                        ',"isRevision":false' .
                                        ',"revisions":[]}]', $s);
    }
    private function setupReadTest() {
        return $this->setupInstallCtypeTest();
    }
    private function insertTestMovie($id = '1') {
        $this->insertContent('Movies', [['Fus'], [$id]]);
    }
    private function sendListMoviesRequest($s) {
        $this->sendResponseBodyCapturingRequest(new Request('/movies', 'GET'), $s);
    }
    private function verifyResponseBodyEquals($expectedJson, $s) {
        $this->assertEquals($expectedJson, $s->actualResponseBody);
    }


    ////////////////////////////////////////////////////////////////////////////


    public function testPluginCanCRUDCreate() {
        $s = $this->setupCreateTest();
        $this->sendInsertMovieRequest($s);
        $this->verifyResponseBodyEquals('{"my":"response"}', $s);
        $this->verifyMovieWasInsertedToDb('A movie');
    }
    private function setupCreateTest() {
        return $this->setupInstallCtypeTest();
    }
    private function sendInsertMovieRequest($s) {
        $req = new Request('/movies', 'POST', (object) ['title' => 'A movie']);
        $this->sendResponseBodyCapturingRequest($req, $s);
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
        $newTitle = 'Updated';
        $this->sendUpdateMovieRequest($s, $newTitle);
        $this->verifyResponseBodyEquals('{"my":"response2"}', $s);
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
        $req = new Request('/movies/' . $s->testMovieId, 'PUT',
                           (object) ['title' => $newTitle, 'isRevision' => false]);
        $this->sendResponseBodyCapturingRequest($req, $s);
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
        $app = $this->sendRequest($req, $res, $s->ctx);
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
