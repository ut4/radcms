<?php

namespace RadCms\Tests;

use RadCms\Tests\Self\DbTestCase;
use RadCms\ContentType\ContentTypeMigrator;
use RadCms\Tests\Self\HttpTestUtils;
use RadCms\App;
use RadCms\Framework\FileSystem;
use RadCms\Tests\RadCmsTest;
use RadCms\Framework\Request;
use RadCms\Tests\Self\MutedResponse;

final class PluginsAPIIntegrationTest extends DbTestCase {
    use HttpTestUtils;
    private $config;
    /**
     * @before
     */
    public function beforeEach() {
        $this->config = include RAD_SITE_PATH . 'config.php';
    }
    /**
     * @after
     */
    public function afterEach() {
        RadCmsTest::markPluginAsUninstalled('_MoviesPlugin', self::$db);
        if (self::$db->exec('UPDATE ${p}websiteState SET `activeContentTypes` =' .
                            ' JSON_REMOVE(`activeContentTypes`, \'$."Movies"\')') < 1)
            throw new \RuntimeException('Failed to clean test data.');
        self::$db->exec('DROP TABLE ${p}Movies');
    }
    public function testPluginCanCRUDRead() {
        $s = $this->setupTest1();
        $this->simulatePluginInstall($s);
        $this->insertTestMovie();
        $this->setExpectedResponseBody('[{"id":"1","title":"Fus"}]', $s);
        $this->sendListMoviesRequest($s);
    }
    private function setupTest1() {
        $mockFs = $this->createMock(FileSystem::class);
        $mockFs->method('readDir')->willReturn([RAD_BASE_PATH . 'src/Tests/_MoviesPlugin']);
        return (object) [
            'app' => App::create($this->config, 'Tests', $mockFs, function ($c) {
                $db = self::getDb($c);
                RadCmsTest::markPluginAsInstalled('_MoviesPlugin', $db);
                return $db;
            }),
            'expectedResponseBody' => null
        ];
    }
    private function simulatePluginInstall($s) {
        $testPlugin = $s->app->ctx->plugins->toArray()[0];
        $testPlugin->impl->install(new ContentTypeMigrator(self::$db));
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
        $this->makeRequest($req, $res, $s->app);
    }
}
