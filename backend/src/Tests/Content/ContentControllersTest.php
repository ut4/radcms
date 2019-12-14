<?php

namespace RadCms\Tests\Content;

use RadCms\Tests\_Internal\DbTestCase;
use RadCms\Tests\_Internal\HttpTestUtils;
use RadCms\Tests\_Internal\ContentTestUtils;
use RadCms\Tests\Installer\InstallerTest;
use Pike\Request;
use RadCms\ContentType\ContentTypeCollection;
use RadCms\ContentType\ContentTypeMigrator;
use RadCms\Tests\_Internal\MutedResponse;

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
        // @allow \Pike\PikeException
        self::$migrator->installMany(self::$testContentTypes);
    }
    public static function tearDownAfterClass($_ = null) {
        parent::tearDownAfterClass($_);
        // @allow \Pike\PikeException
        self::$migrator->uninstallMany(self::$testContentTypes);
        InstallerTest::clearInstalledContentTypesFromDb();
        self::$db->exec('DELETE FROM ${p}ContentRevisions');
    }
    public function tearDown() {
        $this->afterTest->__invoke();
    }
    public function testPOSTContentCreatesContentNode() {
        $s = $this->setupCreateContentTest();
        $this->sendCreateContentNodeRequest($s);
        $this->verifyPOSTContentReturnedLastInsertId($s);
        $this->verifyContentNodeWasInsertedToDb($s);
    }
    private function setupCreateContentTest() {
        $this->afterTest = function () {
            $this->deleteAllTestContentNodes();
        };
        $s = (object) [
            'actualResponseParsed' => null,
            'newProduct' => (object)['title' => 'Uuden tuotteen nimi'],
        ];
        return $s;
    }
    private function sendCreateContentNodeRequest($s, $urlTail = '') {
        $res = $this->createMock(MutedResponse::class);
        $res->expects($this->once())
            ->method('json')
            ->with($this->callback(function ($actualResponse) use ($s) {
                $s->actualResponseParsed = $actualResponse;
                return true;
            }))
            ->willReturn($res);
        $req = new Request('/api/content/Products' . $urlTail,
                           'POST',
                           $s->newProduct);
        $this->sendRequest($req, $res);
    }
    private function verifyPOSTContentReturnedLastInsertId($s, $expectedNumAffected = '1') {
        $this->assertEquals($expectedNumAffected, $s->actualResponseParsed['numAffectedRows']);
        $this->assertEquals(true, $s->actualResponseParsed['lastInsertId'] > 0);
    }
    private function verifyContentNodeWasInsertedToDb($s) {
        $this->assertEquals($s->newProduct->title, self::$db->fetchOne(
            'SELECT `title` FROM ${p}Products WHERE `id` = ?',
            [$s->actualResponseParsed['lastInsertId']]
        )['title']);
    }


    ////////////////////////////////////////////////////////////////////////////


    public function testPOSTContentCreatesContentNodeAndRevision() {
        $s = $this->setupCreateContentTest();
        $s->newProduct->title .= '2';
        $this->sendCreateContentNodeRequest($s, '/with-revision');
        $this->verifyPOSTContentReturnedLastInsertId($s, '2');
        $this->verifyContentNodeWasInsertedToDb($s);
        $this->verifyRevisionWasInsertedToDb($s);
    }
    private function verifyRevisionWasInsertedToDb($s) {
        $this->assertEquals(json_encode(['title' => $s->newProduct->title]), self::$db->fetchOne(
            'SELECT `revisionSnapshot` FROM ${p}ContentRevisions WHERE `contentId` = ?' .
            ' AND `contentType` = ?',
            [$s->actualResponseParsed['lastInsertId'], 'Products']
        )['revisionSnapshot']);
    }


    ////////////////////////////////////////////////////////////////////////////


    public function testGETContentReturnsContentNode() {
        $s = $this->setupGetContentTest();
        $this->insertTestContentNode($s->productId);
        $this->sendGetContentNodeRequest($s);
        $this->assertEquals('{"id":"10"' .
                            ',"isPublished":true' .
                            ',"title":"Tuotteen nimi"' .
                            ',"contentType":"Products"' .
                            ',"revisionCreatedAt":null' .
                            ',"isRevision":false' .
                            ',"revisions":[]}', $s->actualResponseBody);
    }
    private function setupGetContentTest() {
        $this->afterTest = function () {
            $this->deleteAllTestContentNodes();
        };
        return (object) [
            'productId' => 10,
            'actualResponseBody' => null
        ];
    }
    private function sendGetContentNodeRequest($s) {
        $req = new Request('/api/content/' . $s->productId . '/Products', 'GET');
        $this->sendResponseBodyCapturingRequest($req, $s);
    }


    ////////////////////////////////////////////////////////////////////////////


    public function testPUTContentUpdatesContentNode() {
        $s = $this->setupUpdateContentTest();
        $this->insertTestContentNode($s->productId);
        $this->sendUpdateContentNodeRequest($s);
        $this->verifyContentNodeWasUpdatedToDb($s);
        $this->assertEquals('{"numAffectedRows":1}', $s->actualResponseBody);
    }
    private function setupUpdateContentTest() {
        $s = $this->setupGetContentTest();
        $s->productId = 20;
        $s->newData = (object)['title' => 'Päivitetty tuotteen nimi',
                               'isRevision' => false];
        return $s;
    }
    private function sendUpdateContentNodeRequest($s, $urlTail = '') {
        $res = $this->createMock(MutedResponse::class);
        $res->expects($this->once())
            ->method('json')
            ->with($this->callback(function ($actualResponse) use ($s) {
                $s->actualResponseBody = json_encode($actualResponse);
                return true;
            }))
            ->willReturn($res);
        $req = new Request('/api/content/' . $s->productId . '/Products' . $urlTail,
                           'PUT',
                           $s->newData);
        $this->sendRequest($req, $res);
    }
    private function verifyContentNodeWasUpdatedToDb($s, $isPublished = false) {
        $row = self::$db->fetchOne(
            'SELECT `title`, `isPublished` FROM ${p}Products WHERE `id` = ?',
            [$s->productId]
        ) ?? [];
        $this->assertEquals($s->newData->title, $row['title']);
        $this->assertEquals((int)$isPublished, $row['isPublished']);
    }


    ////////////////////////////////////////////////////////////////////////////


    public function testPUTContentUpdatesRevision() {
        $s = $this->setupUpdateRevisionTest();
        $this->insertTestContentNode($s->productId);
        $this->insertRevision($s->productId, 'Products');
        $this->sendUpdateContentNodeRequest($s);
        $this->assertEquals('{"numAffectedRows":1}', $s->actualResponseBody);
        $this->verifyRevisionWasUpdatedToDb($s);
    }
    private function setupUpdateRevisionTest() {
        $s = $this->setupUpdateContentTest();
        $s->productId += 10;
        $s->newData->title .= 2;
        $s->newData->isRevision = true;
        return $s;
    }
    private function verifyRevisionWasUpdatedToDb($s) {
        $expectedSnapshot = json_encode(['title' => $s->newData->title],
                                        JSON_UNESCAPED_UNICODE);
        $this->assertEquals($expectedSnapshot, self::$db->fetchOne(
            'SELECT `revisionSnapshot` FROM ${p}ContentRevisions' .
            ' WHERE `contentId` = ? AND `contentType` = ?',
            [$s->productId, 'Products']
        )['revisionSnapshot']);
    }


    ////////////////////////////////////////////////////////////////////////////


    public function testPUTContentPublishesContent() {
        $s = $this->setupPublishContentTest();
        $this->insertTestContentNode($s->productId, false);
        $this->insertRevision($s->productId, 'Products');
        $this->sendUpdateContentNodeRequest($s, '/publish');
        $this->assertEquals('{"numAffectedRows":2}', $s->actualResponseBody);
        $this->verifyRevisionWasDeletedFromDb($s);
        $this->verifyContentNodeWasUpdatedToDb($s, true);
    }
    private function setupPublishContentTest() {
        $s = $this->setupUpdateContentTest();
        $s->productId += 20;
        $s->newData->title .= 3;
        $s->newData->isRevision = true;
        return $s;
    }
    private function verifyRevisionWasDeletedFromDb($s) {
        $this->assertEquals(null, self::$db->fetchOne(
            'SELECT `revisionSnapshot` FROM ${p}ContentRevisions' .
            ' WHERE `contentId` = ? AND `contentType` = ?',
            [$s->productId, 'Products']
        ));
    }
    private function insertTestContentNode($id, $isPublished = true) {
        $this->insertContent('Products', [['Tuotteen nimi'], [$id, $isPublished]]);
    }
    private function deleteAllTestContentNodes() {
        $this->deleteContent('Products');
    }
}
