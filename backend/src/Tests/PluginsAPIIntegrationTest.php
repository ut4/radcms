<?php

namespace RadCms\Tests;

use RadCms\Tests\Self\DbTestCase;
use RadCms\ContentType\ContentTypeMigrator;
use RadCms\Tests\Self\HttpTestUtils;
use RadCms\App;
use RadCms\Framework\FileSystem;
use RadCms\Tests\AppTest;
use RadCms\Framework\Request;
use RadCms\Tests\Self\MutedResponse;
use RadCms\Tests\_MoviesPlugin\_MoviesPlugin;
use RadCms\Plugin\Plugin;

final class PluginsAPIIntegrationTest extends DbTestCase {
    use HttpTestUtils;
    private $testPlugin;
    public function setupTestPlugin() {
        // Tekee suunnilleen saman kuin PUT /api/plugins/_MoviesPlugin/install
        $db = self::getDb();
        $this->testPlugin = new Plugin('_MoviesPlugin', _MoviesPlugin::class);
        $m = new ContentTypeMigrator($db);
        $m->setOrigin($this->testPlugin);
        $this->testPlugin->instantiate()->install($m);
        AppTest::markPluginAsInstalled('_MoviesPlugin', $db);
    }
    public function tearDown() {
        if ($this->testPlugin) {
            // Tekee suunnilleen saman kuin PUT /api/plugins/_MoviesPlugin/uninstall
            $this->testPlugin->impl->uninstall(new ContentTypeMigrator(self::$db));
            AppTest::markPluginAsUninstalled('_MoviesPlugin', self::$db);
        }
    }
    public static function tearDownAfterClass($_ = null) {
        parent::tearDownAfterClass(null);
        self::$db->exec('UPDATE ${p}websiteState SET' .
                        ' `installedContentTypesLastUpdated` = NULL');
    }
    public function testPluginCanInstallContentType() {
        $this->testPlugin = null;
        $this->assertEquals('todo', '');
    }


    ////////////////////////////////////////////////////////////////////////////


    public function testPluginCanCRUDRead() {
        $s = $this->setupTest1();
        $this->insertTestMovie();
        $this->setExpectedResponseBody('[{"id":"1","title":"Fus"}]', $s);
        $this->sendListMoviesRequest($s);
    }
    private function setupTest1() {
        $this->setupTestPlugin();
        $ctx = (object)['fs' => $this->createMock(FileSystem::class)];
        $ctx->fs->method('readDir')->willReturn([RAD_BASE_PATH . 'src/Tests/_MoviesPlugin']);
        return (object) [
            'ctx' => $ctx,
            'expectedResponseBody' => null
        ];
    }
    private function insertTestMovie() {
        if (self::$db->exec('INSERT INTO ${p}Movies VALUES (1,\'Fus\')') < 1)
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
}
