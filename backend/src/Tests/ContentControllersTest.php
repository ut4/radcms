<?php

namespace RadCms\Tests;

use RadCms\Tests\Self\DbTestCase;
use RadCms\Tests\Self\HttpTestUtils;
use RadCms\Framework\Request;
use RadCms\ContentType\ContentTypeCollection;
use RadCms\ContentType\ContentTypeMigrator;
use RadCms\Tests\Self\MutedResponse;

final class ContentControllersTest extends DbTestCase {
    use HttpTestUtils;
    private $afterTest;
    private static $testContentTypes;
    private static $migrator;
    public static function setUpBeforeClass() {
        self::$testContentTypes = new ContentTypeCollection();
        self::$testContentTypes->add('Products', 'Tuotteet', ['title' => 'text']);
        self::$migrator = new ContentTypeMigrator(self::getDb());
        // @allow \RadCms\Common\RadException
        self::$migrator->installMany(self::$testContentTypes);
    }
    public static function tearDownAfterClass($_ = null) {
        parent::tearDownAfterClass($_);
        // @allow \RadCms\Common\RadException
        self::$migrator->uninstallMany(self::$testContentTypes);
    }
    public function tearDown() {
        $this->afterTest->__invoke();
    }
    public function testGETContentReturnsContentNode() {
        $s = $this->setupTest1();
        $this->insertTestContentNode($s->productId);
        $this->setExpectedResponseBody('{"id":"1","title":"Tuotteen nimi"}', $s);
        $this->sendGetContentNodeRequest($s);
    }
    private function setupTest1() {
        $this->afterTest = function () {
            $this->deleteAllTestContentNodes();
        };
        return (object) [
            'productId' => 1,
            'expectedResponseBody' => null,
        ];
    }
    private function setExpectedResponseBody($expectedJson, $s) {
        $s->expectedResponseBody = $this->callback(
            function ($actualData) use ($expectedJson) {
                return json_encode($actualData) == $expectedJson;
            });
    }
    private function sendGetContentNodeRequest($s) {
        $res = $this->createMock(MutedResponse::class);
        $res->expects($this->once())
            ->method('json')
            ->with($s->expectedResponseBody)
            ->willReturn($res);
        $req = new Request('/api/content/' . $s->productId . '/Products',
                           'GET');
        $this->makeRequest($req, $res);
    }


    ////////////////////////////////////////////////////////////////////////////


    public function testPUTContentUpdatesContentNode() {
        $s = $this->setupTest2();
        $this->insertTestContentNode($s->productId);
        $this->setExpectedResponseBody('{"numAffectedRows":1}', $s);
        $this->sendUpdateContentNodeRequest($s);
        $this->verifyContentNodeWasUpdatedToDb($s);
    }
    private function setupTest2() {
        $s = $this->setupTest1();
        $s->productId = 2;
        $s->newData = (object)['title' => 'Päivitetty tuotteen nimi'];
        return $s;
    }
    private function sendUpdateContentNodeRequest($s) {
        $res = $this->createMock(MutedResponse::class);
        $res->expects($this->once())
            ->method('json')
            ->with($s->expectedResponseBody)
            ->willReturn($res);
        $req = new Request('/api/content/' . $s->productId . '/Products',
                           'PUT',
                           $s->newData);
        $this->makeRequest($req, $res);
    }
    private function verifyContentNodeWasUpdatedToDb($s) {
        $this->assertEquals($s->newData->title, self::$db->fetchOne(
            'SELECT `title` FROM ${p}Products WHERE `id` = ?',
            [$s->productId]
        )['title']);
    }
    private function insertTestContentNode($id) {
        if (self::$db->exec('INSERT INTO ${p}Products VALUES (?,\'Tuotteen nimi\')', [$id]) < 1)
            throw new \RuntimeException('Failed to insert test data');
    }
    private function deleteAllTestContentNodes() {
        if (self::$db->exec('DELETE FROM ${p}Products') < 1)
            throw new \RuntimeException('Failed to clean test data');
    }
}
