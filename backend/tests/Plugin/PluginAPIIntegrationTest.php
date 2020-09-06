<?php

namespace RadCms\Tests\Plugin;

use Pike\{FileSystem, Request};
use Pike\TestUtils\{DbTestCase, HttpTestUtils, MutedResponse};
use RadCms\{APIConfigsStorage, AppContext, BaseAPI};
use RadCms\Content\DAO;
use RadCms\ContentType\ContentTypeMigrator;
use RadCms\Plugin\MigrationAPI;
use RadCms\Plugin\Plugin;
use RadCms\Tests\AppTest;
use RadCms\Tests\_Internal\ContentTestUtils;
use RadPlugins\MoviesPlugin\MoviesPlugin;

final class PluginAPIIntegrationTest extends DbTestCase {
    use HttpTestUtils;
    use ContentTestUtils;
    private $contentTypeMigrator;
    private $moviesPlugin;
    private $moviesPluginInstance;
    private $app;
    public function setupTestPlugin($initialData) {
        // Tekee suunnilleen saman kuin PUT /api/plugins/MoviesPlugin/install
        $db = self::getDb();
        $this->moviesPlugin = new Plugin('MoviesPlugin', MoviesPlugin::class);
        $this->moviesPluginInstance = $this->moviesPlugin->instantiate();
        $this->contentTypeMigrator = new ContentTypeMigrator($db);
        $this->moviesPluginInstance->install(new MigrationAPI($this->moviesPlugin,
                                            $this->contentTypeMigrator,
                                            new FileSystem), $initialData);
        AppTest::markPluginAsInstalled('MoviesPlugin', $db);
        //
        $ctx = new AppContext(['db' => '@auto', 'auth' => '@auto']);
        $ctx->fs = $this->getMockBuilder(FileSystem::class)
            ->setMethods(['readDir'])
            ->getMock();
        $ctx->fs->method('readDir')
            ->with($this->stringEndsWith('plugins'))
            ->willReturn([dirname(RAD_PUBLIC_PATH) . '/_test-plugins/MoviesPlugin']);
        $this->app = $this->makeApp('\RadCms\App::create', $this->getAppConfig(),
            $ctx);
    }
    public function tearDown(): void {
        parent::tearDown();
        if ($this->moviesPluginInstance) {
            // Tekee suunnilleen saman kuin PUT /api/plugins/MoviesPlugin/uninstall
            $this->moviesPluginInstance->uninstall(new MigrationAPI($this->moviesPlugin,
                                           $this->contentTypeMigrator,
                                           new FileSystem));
            AppTest::markPluginAsUninstalled('MoviesPlugin', self::$db);
        }
    }
    public static function tearDownAfterClass(): void {
        parent::tearDownAfterClass();
        self::clearInstalledContentTypesFromDb(false);
    }
    public function testPluginCanInstallContentType() {
        $initialMovies = [['Movies', [(object)['title' => 'Initial movie',
                                               'releaseYear' => 2019]]]];
        $this->setupInstallCtypeTest($initialMovies);
        $this->verifyContentTypeWasInstalledToDb();
        $this->verifyInitialDataWasInsertedToDb();
    }
    private function setupInstallCtypeTest($initialMovies = []) {
        $this->setupTestPlugin($initialMovies);
        return (object) [
            'actualResponseBody' => null,
            'testMovieId' => null,
        ];
    }
    private function verifyContentTypeWasInstalledToDb() {
        $this->verifyContentTypeIsInstalled('Movies', true);
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
                                        ',"status":' . DAO::STATUS_PUBLISHED .
                                        ',"title":"Fus"' .
                                        ',"releaseYear":"2020"' .
                                        ',"contentType":"Movies"' .
                                        ',"isRevision":false' .
                                        ',"revisions":[]}]', $s);
    }
    private function setupReadTest() {
        return $this->setupInstallCtypeTest();
    }
    private function insertTestMovie($id = 1) {
        $this->insertContent('Movies', ['id' => $id,
                                        'title' => 'Fus',
                                        'releaseYear' => 2020]);
    }
    private function sendListMoviesRequest($s) {
        $res = $this->createBodyCapturingMockResponse($s);
        $this->sendRequest(new Request('/plugins/movies-plugin', 'GET'), $res, $this->app);
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
        $req = new Request('/plugins/movies-plugin', 'POST',
                           (object) ['title' => 'A movie',
                                     'releaseYear' => 2021]);
        $res = $this->createBodyCapturingMockResponse($s);
        $this->sendRequest($req, $res, $this->app);
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
        $req = new Request("/plugins/movies-plugin/{$s->testMovieId}", 'PUT',
                            (object)['title' => $newData->title,
                                     'releaseYear' => $newData->releaseYear,
                                     'isRevision' => false]);
        $res = $this->createBodyCapturingMockResponse($s);
        $this->sendRequest($req, $res, $this->app);
    }
    private function verifyMovieWasUpdatedToDb($newData) {
        $this->assertEquals(1, count(self::$db->fetchAll(
            'SELECT `id` FROM ${p}Movies WHERE `title` = ? AND `releaseYear` = ?',
            [$newData->title, $newData->releaseYear]
        )));
    }


    ////////////////////////////////////////////////////////////////////////////


    public function testPluginCanEnqueuAdminJsFilesAndAdminPanels() {
        $this->setupFileRegTest();
        $res = $this->createMock(MutedResponse::class);
        $req = new Request('/noop', 'GET');
        $this->sendRequest($req, $res, $this->app);
        $apiState = $this->app->getAppCtx()->cmsState->getApiConfigs();
        $this->verifyAdminJsFilesWereEnqueued($apiState);
        $this->verifyAdminPanelsWereEnqueued($apiState);
    }
    private function setupFileRegTest() {
        return $this->setupReadTest();
    }
    private function verifyAdminJsFilesWereEnqueued(APIConfigsStorage $apiState) {
        $actual = $apiState->getEnqueuedJsFiles(BaseAPI::TARGET_CONTROL_PANEL_LAYOUT);
        $this->assertEquals(2, count($actual));
        $this->assertEquals([(object)[
            'url' => 'file1.js',
            'attrs' => []
        ], (object)[
            'url' => 'file2.js',
            'attrs' => ['id' => 'file2']
        ]], $actual);
    }
    private function verifyAdminPanelsWereEnqueued(APIConfigsStorage $apiState) {
        $actual = $apiState->getEnqueuedAdminPanels();
        $this->assertEquals(1, count($actual));
        $this->assertEquals((object)[
            'impl' => 'MoviesAdmin',
            'title' => 'Elokuvat-app',
        ], $actual[0]);
    }
}
