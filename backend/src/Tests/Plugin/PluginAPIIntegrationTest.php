<?php

namespace RadCms\Tests\Plugin;

use Pike\TestUtils\DbTestCase;
use Pike\TestUtils\HttpTestUtils;
use RadCms\Tests\_Internal\ContentTestUtils;
use RadCms\ContentType\ContentTypeMigrator;
use Pike\FileSystem;
use RadCms\Tests\AppTest;
use Pike\Request;
use Pike\TestUtils\MutedResponse;
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
    public static function tearDownAfterClass() {
        parent::tearDownAfterClass();
        self::clearInstalledContentTypesFromDb();
    }
    public function testPluginCanInstallContentType() {
        $initialMovies = [['Movies', [(object)['title' => 'Initial movie',
                                               'releaseYear' => 2019]]]];
        $s = $this->setupInstallCtypeTest($initialMovies);
        $this->verifyContentTypeWasInstalledToDb();
        $this->verifyInitialDataWasInsertedToDb();
    }
    private function setupInstallCtypeTest($initialMovies = null) {
        $this->setupTestPlugin($initialMovies);
        $ctx = (object)['fs' => $this->createMock(FileSystem::class)];
        $ctx->fs->method('readDir')->willReturn([dirname(RAD_SITE_PATH) . '/_test-plugins/MoviesPlugin']);
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
                                        ',"releaseYear":"2020"' .
                                        ',"contentType":"Movies"' .
                                        ',"isRevision":false' .
                                        ',"revisions":[]}]', $s);
    }
    private function setupReadTest() {
        return $this->setupInstallCtypeTest();
    }
    private function insertTestMovie($id = '1') {
        $this->insertContent('Movies', [['Fus', 2020], [$id]]);
    }
    private function sendListMoviesRequest($s) {
        $this->sendResponseBodyCapturingRequest(new Request('/movies', 'GET'),
                                                '\RadCms\App::create',
                                                $s);
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
        $req = new Request('/movies', 'POST', (object) ['title' => 'A movie',
                                                        'releaseYear' => 2021]);
        $this->sendResponseBodyCapturingRequest($req, '\RadCms\App::create', $s);
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
        $newData = (object)['title' => 'Updated', 'releaseYear' => 2022];
        $this->sendUpdateMovieRequest($s, $newData);
        $this->verifyResponseBodyEquals('{"my":"response2"}', $s);
        $this->verifyMovieWasUpdatedToDb($newData);
    }
    private function setupUpdateTest() {
        $out = $this->setupInstallCtypeTest();
        $out->testMovieId = '10';
        // @allow \RuntimeException
        $this->insertTestMovie($out->testMovieId);
        return $out;
    }
    private function sendUpdateMovieRequest($s, $newData) {
        $req = new Request('/movies/' . $s->testMovieId, 'PUT',
                            (object)['title' => $newData->title,
                                     'releaseYear' => $newData->releaseYear,
                                     'isRevision' => false]);
        $this->sendResponseBodyCapturingRequest($req, '\RadCms\App::create', $s);
    }
    private function verifyMovieWasUpdatedToDb($newData) {
        $this->assertEquals(1, count(self::$db->fetchAll(
            'SELECT `id` FROM ${p}Movies WHERE `title` = ? AND `releaseYear` = ?',
            [$newData->title, $newData->releaseYear]
        )));
    }


    ////////////////////////////////////////////////////////////////////////////


    public function testPluginCanRegisterJsFilesAndAdminPanels() {
        $s = $this->setupFileRegTest();
        $res = $this->createMock(MutedResponse::class);
        $req = new Request('/noop', 'GET');
        $this->sendRequest($req, $res, '\RadCms\App::create', $s->ctx);
        $this->verifyJsFilesWereRegistered($s->ctx->state);
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
