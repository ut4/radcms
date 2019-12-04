<?php

namespace RadCms\Tests;

use RadCms\Tests\Self\DbTestCase;
use RadCms\Tests\Self\HttpTestUtils;
use RadCms\Tests\Self\ContentTestUtils;
use RadCms\Framework\Request;
use RadCms\ContentType\ContentTypeCollection;
use RadCms\ContentType\ContentTypeMigrator;
use RadCms\Tests\Self\MutedResponse;

final class ContentControllersTest extends DbTestCase {
    use HttpTestUtils;
    use ContentTestUtils;
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
        InstallerTest::clearInstalledContentTypesFromDb();
        self::$db->exec('DELETE FROM ${p}ContentRevisions');
    }
    public function tearDown() {
        $this->afterTest->__invoke();
    }
    public function testPOSTContentCreatesContentNode() {
        $s = $this->setupPOSTTest();
        $this->setExpectedResponseBody(
            $this->callback(function ($actualResponse) use ($s) {
                $s->httpReturnBody = $actualResponse;
                return true; // ignore
            }),
            $s
        );
        $this->sendCreateContentNodeRequest($s);
        $this->verifyPOSTContentReturnedLastInsertId($s);
        $this->verifyContentNodeWasInsertedToDb($s);
    }
    private function setupPOSTTest() {
        $this->afterTest = function () {
            $this->deleteAllTestContentNodes();
        };
        $s = (object) [
            'expectedResponseBody' => null,
            'httpReturnBody' => null,
            'newProduct' => (object)['title' => 'Uuden tuotteen nimi'],
        ];
        return $s;
    }
    private function setExpectedResponseBody($expected, $s, $actualDataFilterFn = null) {
        $s->expectedResponseBody = is_string($expected) ? $this->callback(
            function ($actualData) use ($expected) {
                //if ($actualDataFilterFn) $actualData = $actualDataFilterFn($actualData);
                return json_encode($actualData) == $expected;
            }) : $expected;
    }
    private function sendCreateContentNodeRequest($s, $urlTail = '') {
        $res = $this->createMock(MutedResponse::class);
        $res->expects($this->once())
            ->method('json')
            ->with($s->expectedResponseBody)
            ->willReturn($res);
        $req = new Request('/api/content/Products' . $urlTail,
                           'POST',
                           $s->newProduct);
        $this->makeRequest($req, $res);
    }
    private function verifyPOSTContentReturnedLastInsertId($s, $expectedNumAffected = '1') {
        $this->assertEquals($expectedNumAffected, $s->httpReturnBody['numAffectedRows']);
        $this->assertEquals(true, $s->httpReturnBody['lastInsertId'] > 0);
    }
    private function verifyContentNodeWasInsertedToDb($s) {
        $this->assertEquals($s->newProduct->title, self::$db->fetchOne(
            'SELECT `title` FROM ${p}Products WHERE `id` = ?',
            [$s->httpReturnBody['lastInsertId']]
        )['title']);
    }


    ////////////////////////////////////////////////////////////////////////////


    public function testPOSTContentCreatesContentNodeAndRevision() {
        $s = $this->setupPOSTTest();
        $s->newProduct->title .= '2';
        $this->setExpectedResponseBody(
            $this->callback(function ($actualResponse) use ($s) {
                $s->httpReturnBody = $actualResponse;
                return true; // ignore
            }),
            $s
        );
        $this->sendCreateContentNodeRequest($s, '/with-revision');
        $this->verifyPOSTContentReturnedLastInsertId($s, '2');
        $this->verifyContentNodeWasInsertedToDb($s);
        $this->verifyRevisionWasInsertedToDb($s);
    }
    private function verifyRevisionWasInsertedToDb($s) {
        $this->assertEquals(json_encode($s->newProduct), self::$db->fetchOne(
            'SELECT `revisionSnapshot` FROM ${p}ContentRevisions WHERE `contentId` = ?' .
            ' AND `contentType` = ?',
            [$s->httpReturnBody['lastInsertId'], 'Products']
        )['revisionSnapshot']);
    }


    ////////////////////////////////////////////////////////////////////////////


    public function testGETContentReturnsContentNode() {
        $s = $this->setupGETTest();
        $this->insertTestContentNode($s->productId);
        $this->setExpectedResponseBody('{"id":"10"' .
                                      ',"isPublished":true' .
                                       ',"title":"Tuotteen nimi"' .
                                       ',"contentType":"Products"' .
                                       ',"isRevision":false' .
                                       ',"revisions":[]}', $s);
        $this->sendGetContentNodeRequest($s);
    }
    private function setupGETTest() {
        $this->afterTest = function () {
            $this->deleteAllTestContentNodes();
        };
        return (object) [
            'productId' => 10,
            'expectedResponseBody' => null,
        ];
    }
    private function sendGetContentNodeRequest($s) {
        $res = $this->createMock(MutedResponse::class);
        $res->expects($this->once())
            ->method('json')
            ->with($s->expectedResponseBody)
            ->willReturn($res);
        $req = new Request('/api/content/' . $s->productId . '/Products', 'GET');
        $this->makeRequest($req, $res);
    }


    ////////////////////////////////////////////////////////////////////////////


    public function testPUTContentUpdatesContentNode() {
        $s = $this->setupPUTTest();
        $this->insertTestContentNode($s->productId);
        $this->setExpectedResponseBody('{"numAffectedRows":1}', $s);
        $this->sendUpdateContentNodeRequest($s);
        $this->verifyContentNodeWasUpdatedToDb($s);
    }
    private function setupPUTTest() {
        $s = $this->setupGETTest();
        $s->productId = 20;
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
        $this->insertContent('Products', [['Tuotteen nimi'], [$id]]);
        //if (self::$db->exec('INSERT INTO ${p}Products VALUES (?,1,\'Tuotteen nimi\')', [$id]) < 1)
        //    throw new \RuntimeException('Failed to insert test data');
    }
    private function deleteAllTestContentNodes() {
        $this->deleteContent('Products');
        //if (self::$db->exec('DELETE FROM ${p}Products') < 1)
        //    throw new \RuntimeException('Failed to clean test data');
    }
}
