<?php

namespace RadCms\Tests\Content;

use Pike\TestUtils\DbTestCase;
use Pike\TestUtils\HttpTestUtils;
use RadCms\Tests\_Internal\ContentTestUtils;
use Pike\Request;
use RadCms\ContentType\ContentTypeCollection;
use RadCms\ContentType\ContentTypeMigrator;
use Pike\Response;
use RadCms\Content\DAO;

final class ContentControllersTest extends DbTestCase {
    use HttpTestUtils;
    use ContentTestUtils;
    private static $testContentTypes;
    private static $migrator;
    private $app;
    public static function setUpBeforeClass(): void {
        self::$testContentTypes = new ContentTypeCollection();
        self::$testContentTypes->add('Products', 'Tuotteet', [
            (object) ['name' => 'title', 'dataType' => 'text']
        ]);
        self::$testContentTypes->add('Brands', 'Tuotemerkit', [
            (object) ['name' => 'name', 'dataType' => 'text']
        ]);
        self::$migrator = new ContentTypeMigrator(self::getDb());
        // @allow \Pike\PikeException
        self::$migrator->installMany(self::$testContentTypes);
    }
    public static function tearDownAfterClass(): void {
        parent::tearDownAfterClass();
        // @allow \Pike\PikeException
        self::$migrator->uninstallMany(self::$testContentTypes);
        self::clearInstalledContentTypesFromDb();
    }
    protected function setUp(): void {
        parent::setUp();
        $this->app = $this->makeApp('\RadCms\App::create', $this->getAppConfig());
    }
    public function tearDown(): void {
        $this->deleteAllTestProducts();
    }
    public function testPOSTContentCreatesContentNode() {
        $s = $this->setupCreateContentTest();
        $this->sendCreateContentNodeRequest($s);
        $this->verifyPOSTContentReturnedLastInsertId($s);
        $this->verifyContentNodeWasInsertedToDb($s);
    }
    private function setupCreateContentTest() {
        $s = (object) [
            'actualResponseBody' => null,
            'actualResponseParsed' => null,
            'newProduct' => (object)['title' => 'Uuden tuotteen nimi'],
        ];
        return $s;
    }
    private function sendCreateContentNodeRequest($s, $urlTail = '') {
        $req = new Request("/api/content/Products{$urlTail}",
                           'POST',
                           $s->newProduct);
        $res = $this->createMock(Response::class);
        $this->sendResponseBodyCapturingRequest($req, $res, $this->app, $s);
        $s->actualResponseParsed = json_decode($s->actualResponseBody);
    }
    private function verifyPOSTContentReturnedLastInsertId($s, $expectedNumAffected = '1') {
        $this->assertEquals($expectedNumAffected, $s->actualResponseParsed->numAffectedRows);
        $this->assertEquals(true, $s->actualResponseParsed->lastInsertId > 0);
    }
    private function verifyContentNodeWasInsertedToDb($s) {
        $this->assertEquals($s->newProduct->title, self::$db->fetchOne(
            'SELECT `title` FROM ${p}Products WHERE `id` = ?',
            [$s->actualResponseParsed->lastInsertId]
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
        $this->verifyRevisionSnapshotEquals($s->newProduct,
                                            $s->actualResponseParsed->lastInsertId,
                                            'Products');
    }
    private function verifyRevisionSnapshotEquals($expected, $cNodeId, $cTypeName) {
        $actual = json_decode(self::$db->fetchOne(
            'SELECT `revisionSnapshot` FROM ${p}contentRevisions' .
            ' WHERE `contentId` = ? AND `contentType` = ?',
            [$cNodeId, $cTypeName]
        )['revisionSnapshot']);
        $this->assertEquals($expected->title, $actual->title);
    }


    ////////////////////////////////////////////////////////////////////////////


    public function testGETContentReturnsContentNode() {
        $s = $this->setupGetContentTest();
        $this->insertTestProduct();
        $this->sendGetContentNodeRequest($s);
        $this->assertEquals('{"id":"1"' .
                            ',"status":' . DAO::STATUS_PUBLISHED .
                            ',"title":"Tuotteen nimi"' .
                            ',"contentType":"Products"' .
                            ',"revisionCreatedAt":null' .
                            ',"isRevision":false' .
                            ',"revisions":[]}', $s->actualResponseBody);
    }
    private function setupGetContentTest() {
        return (object) [
            'actualResponseBody' => null
        ];
    }
    private function sendGetContentNodeRequest($s) {
        $req = new Request('/api/content/1/Products', 'GET');
        $res = $this->createMock(Response::class);
        $this->sendResponseBodyCapturingRequest($req, $res, $this->app, $s);
    }


    ////////////////////////////////////////////////////////////////////////////


    public function testGETContentReturnsContentNodesByContentType() {
        $s = $this->setupGetContentTest();
        $this->insertTestProduct();
        $this->insertTestBrand();
        $this->sendGetContentNodesByTypeRequest($s);
        $this->assertEquals('[{"id":"1"' .
                            ',"status":' . DAO::STATUS_PUBLISHED .
                            ',"name":"Tuotemerkin nimi"' .
                            ',"contentType":"Brands"' .
                            ',"revisionCreatedAt":null' .
                            ',"isRevision":false' .
                            ',"revisions":[]}]', $s->actualResponseBody);
    }
    private function sendGetContentNodesByTypeRequest($s) {
        $req = new Request('/api/content/Brands', 'GET');
        $res = $this->createMock(Response::class);
        $this->sendResponseBodyCapturingRequest($req, $res, $this->app, $s);
    }


    ////////////////////////////////////////////////////////////////////////////


    public function testPUTContentUpdatesContentNode() {
        $s = $this->setupUpdateContentTest();
        $this->insertTestProduct();
        $this->sendUpdateContentNodeRequest($s);
        $this->verifyContentNodeWasUpdatedToDb($s);
        $this->assertEquals('{"numAffectedRows":1}', $s->actualResponseBody);
    }
    private function setupUpdateContentTest() {
        $s = $this->setupGetContentTest();
        $s->newData = (object)['title' => 'Päivitetty tuotteen nimi',
                               'isRevision' => false];
        return $s;
    }
    private function sendUpdateContentNodeRequest($s, $urlTail = '') {
        $req = new Request("/api/content/1/Products{$urlTail}",
                           'PUT',
                           $s->newData);
        $res = $this->createMock(Response::class);
        $this->sendResponseBodyCapturingRequest($req, $res, $this->app, $s);
    }
    private function verifyContentNodeWasUpdatedToDb($s) {
        $row = self::$db->fetchOne(
            'SELECT `title`, `status` FROM ${p}Products WHERE `id` = 1'
        ) ?? [];
        $this->assertEquals($s->newData->title, $row['title']);
        $this->assertEquals(DAO::STATUS_PUBLISHED, $row['status']);
    }


    ////////////////////////////////////////////////////////////////////////////


    public function testPUTContentUpdatesRevision() {
        $s = $this->setupUpdateRevisionTest();
        $this->insertTestProduct();
        $this->insertRevision(1, 'Products');
        $this->sendUpdateContentNodeRequest($s);
        $this->assertEquals('{"numAffectedRows":1}', $s->actualResponseBody);
        $this->verifyRevisionWasUpdatedToDb($s);
        $this->deleteAllRevisions();
    }
    private function setupUpdateRevisionTest() {
        $s = $this->setupUpdateContentTest();
        $s->newData->title .= 2;
        $s->newData->isRevision = true;
        return $s;
    }
    private function verifyRevisionWasUpdatedToDb($s) {
        $this->verifyRevisionSnapshotEquals($s->newData, 1, 'Products');
    }


    ////////////////////////////////////////////////////////////////////////////


    public function testPUTContentPublishesContent() {
        $s = $this->setupPublishContentTest();
        $this->insertTestProduct(DAO::STATUS_DRAFT);
        $this->insertRevision(1, 'Products');
        $this->sendUpdateContentNodeRequest($s, '/publish');
        $this->assertEquals('{"numAffectedRows":2}', $s->actualResponseBody);
        $this->verifyRevisionWasDeletedFromDb($s);
        $this->verifyContentNodeWasUpdatedToDb($s);
        $this->deleteAllRevisions();
    }
    private function setupPublishContentTest() {
        $s = $this->setupUpdateContentTest();
        $s->newData->title .= 3;
        $s->newData->isRevision = true;
        return $s;
    }
    private function verifyRevisionWasDeletedFromDb($s) {
        $this->assertEquals(null, self::$db->fetchOne(
            'SELECT `revisionSnapshot` FROM ${p}contentRevisions' .
            ' WHERE `contentId` = 1 AND `contentType` = ?',
            ['Products']
        ));
    }
    private function insertTestProduct($status = DAO::STATUS_PUBLISHED) {
        $this->insertContent('Products', ['id' => 1,
                                          'status' => $status,
                                          'title' => 'Tuotteen nimi']);
    }
    private function insertTestBrand() {
        $this->insertContent('Brands', ['id' => 1,
                                        'name' => 'Tuotemerkin nimi']);
    }
    private function deleteAllTestProducts() {
        $this->deleteContent('Products');
    }
    private function deleteAllRevisions() {
        self::$db->exec('DELETE FROM ${p}contentRevisions');
    }
}
