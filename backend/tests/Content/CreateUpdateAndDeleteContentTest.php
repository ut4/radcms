<?php

namespace RadCms\Tests\Content;

use Pike\Request;
use RadCms\Content\DAO;

final class CreateUpdateAndDeleteContentTest extends ContentControllersTestCase {
    public function testPOSTContentCreatesContentNode() {
        $s = $this->setupCreateContentTest();
        $this->sendCreateContentNodeRequest($s);
        $this->verifyPOSTContentReturnedLastInsertId($s);
        $this->verifyContentNodeWasInsertedToDb($s);
    }
    private function setupCreateContentTest() {
        $state = new \stdClass;
        $state->newProduct = (object) ['title' => 'Uuden tuotteen nimi'];
        $state->spyingResponse = null;
        return $state;
    }
    private function sendCreateContentNodeRequest($s, $urlTail = '') {
        $req = new Request("/api/content/Products{$urlTail}",
                           'POST',
                           $s->newProduct);
        $s->spyingResponse = $this->makeSpyingResponse();
        $this->sendRequest($req, $s->spyingResponse, $this->app);
    }
    private function verifyPOSTContentReturnedLastInsertId($s, $expectedNumAffected = '1') {
        $this->verifyResponseMetaEquals(200, 'application/json', $s->spyingResponse);
        $parsed = json_decode($s->spyingResponse->getActualBody());
        $this->assertEquals($expectedNumAffected, $parsed->numAffectedRows);
        $this->assertEquals(true, $parsed->lastInsertId > 0);
    }
    private function verifyContentNodeWasInsertedToDb($s) {
        $this->assertEquals($s->newProduct->title, self::$db->fetchOne(
            'SELECT `title` FROM ${p}Products WHERE `id` = ?',
            [json_decode($s->spyingResponse->getActualBody())->lastInsertId]
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
    private function verifyRevisionWasInsertedToDb($s, $from = 'from-insert') {
        if ($from === 'from-insert')
            $this->verifyRevisionSnapshotEquals($s->newProduct,
                                                json_decode($s->spyingResponse->getActualBody())
                                                    ->lastInsertId,
                                                'Products');
        else
            $this->verifyRevisionSnapshotEquals($s->newData,
                                                self::TEST_PRODUCT_1['id'],
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


    public function testPUTContentUpdatesContentNode() {
        $s = $this->setupUpdateContentTest();
        $this->insertTestProducts(self::TEST_PRODUCT_1);
        $this->sendUpdateContentNodeRequest($s);
        $this->verifyRespondedSuccesfullyWith('{"numAffectedRows":1}', $s);
        $this->verifyContentNodeWasUpdatedToDb($s);
    }
    private function setupUpdateContentTest() {
        $state = new \stdClass;
        $state->spyingResponse = null;
        $state->newData = (object)['title' => 'Päivitetty tuotteen nimi',
                                   'isRevision' => false];
        return $state;
    }
    private function sendUpdateContentNodeRequest($s, $urlTail = '') {
        $req = new Request("/api/content/" . self::TEST_PRODUCT_1['id'] . "/Products{$urlTail}",
                           'PUT',
                           $s->newData);
        $s->spyingResponse = $this->makeSpyingResponse();
        $this->sendRequest($req, $s->spyingResponse, $this->app);
    }
    private function verifyContentNodeWasUpdatedToDb($s) {
        $this->verifyContentNodeFromDbEquals((object) array_merge(
            (array) $s->newData,
            ['status' => DAO::STATUS_PUBLISHED]
        ));
    }


    ////////////////////////////////////////////////////////////////////////////


    public function testPUTContentUpdatesRevision() {
        $s = $this->setupUpdateRevisionTest();
        $this->insertTestProducts(self::TEST_PRODUCT_1);
        $this->insertRevision(self::TEST_PRODUCT_1['id'], 'Products');
        $this->sendUpdateContentNodeRequest($s);
        $this->verifyRespondedSuccesfullyWith('{"numAffectedRows":1}', $s);
        $this->verifyRevisionWasUpdatedToDb($s);
        $this->deleteAllRevisions();
    }
    private function setupUpdateRevisionTest() {
        $state = $this->setupUpdateContentTest();
        $state->newData->title .= 2;
        $state->newData->isRevision = true;
        return $state;
    }
    private function verifyRevisionWasUpdatedToDb($s) {
        $this->verifyRevisionSnapshotEquals($s->newData, self::TEST_PRODUCT_1['id'], 'Products');
    }


    ////////////////////////////////////////////////////////////////////////////


    public function testPUTContentPublishesContent() {
        $s = $this->setupPublishContentTest();
        $p = self::TEST_PRODUCT_1;
        $p['status'] = DAO::STATUS_DRAFT;
        $this->insertTestProducts($p);
        $this->insertRevision(self::TEST_PRODUCT_1['id'], 'Products');
        $this->sendUpdateContentNodeRequest($s, '/publish');
        $this->verifyRespondedSuccesfullyWith('{"numAffectedRows":2}', $s);
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
            ' WHERE `contentId` = ? AND `contentType` = ?',
            [self::TEST_PRODUCT_1['id'], 'Products']
        ));
    }


    ////////////////////////////////////////////////////////////////////////////


    public function testPUTContentUnpublishesContent() {
        $s = $this->setupUnpublishContentTest();
        $this->insertTestProducts(self::TEST_PRODUCT_1);
        $this->sendUpdateContentNodeRequest($s, '/unpublish');
        $this->verifyRespondedSuccesfullyWith('{"numAffectedRows":2}', $s);
        $this->verifyRevisionWasInsertedToDb($s, 'from-update');
        $this->verifyContentNodeWasUpdatedToDb($s);
        $this->deleteAllRevisions();
    }
    private function setupUnpublishContentTest() {
        $s = $this->setupUpdateContentTest();
        $s->newData->title .= 4;
        return $s;
    }


    ////////////////////////////////////////////////////////////////////////////


    public function testDELETEContentMarksContentNodeAsDeleted() {
        $s = $this->setupUpdateContentTest();
        $this->insertTestProducts(self::TEST_PRODUCT_1);
        $this->sendDeleteContentNodeRequest($s);
        $this->verifyRespondedSuccesfullyWith('{"numAffectedRows":1}', $s);
        $this->verifyContentNodeWasMarkedAsDeletedToDb($s);
    }
    private function sendDeleteContentNodeRequest($s) {
        $req = new Request('/api/content/' . self::TEST_PRODUCT_1['id'] . '/Products', 'DELETE');
        $s->spyingResponse = $this->makeSpyingResponse();
        $this->sendRequest($req, $s->spyingResponse, $this->app);
    }
    private function verifyContentNodeWasMarkedAsDeletedToDb() {
        $this->verifyContentNodeFromDbEquals((object) ['title' => self::TEST_PRODUCT_1['title'],
                                                       'status' => DAO::STATUS_DELETED]);
    }
    private function verifyRespondedSuccesfullyWith($expected, $s) {
        $this->verifyResponseMetaEquals(200, 'application/json', $s->spyingResponse);
        $this->verifyResponseBodyEquals($expected, $s->spyingResponse);
    }
}
