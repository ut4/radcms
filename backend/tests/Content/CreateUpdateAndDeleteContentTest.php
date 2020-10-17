<?php

namespace RadCms\Tests\Content;

use RadCms\Content\DAO;
use RadCms\Tests\_Internal\ApiRequestFactory;

final class CreateUpdateAndDeleteContentTest extends ContentControllersTestCase {
    public function testPOSTContentCreatesContentNodeAndNormalRevision() {
        $s = $this->setupCreateContentTest();
        $this->sendCreateContentNodeRequest($s);
        $this->verifyPOSTContentReturnedLastInsertId($s);
        $this->verifyContentNodeWasInsertedToDb($s);
        $this->verifyRevisionWasInsertedToDb($s, false);
    }
    private function setupCreateContentTest() {
        $state = new \stdClass;
        $state->newProduct = (object) ['title' => 'Uuden tuotteen nimi'];
        $state->spyingResponse = null;
        return $state;
    }
    private function sendCreateContentNodeRequest($s, $urlTail = '') {
        $req = ApiRequestFactory::create("/api/content/Products{$urlTail}",
                                         'POST',
                                         $s->newProduct);
        $s->spyingResponse = $this->makeSpyingResponse();
        $this->sendRequest($req, $s->spyingResponse, $this->app);
    }
    private function verifyPOSTContentReturnedLastInsertId($s) {
        $this->verifyResponseMetaEquals(200, 'application/json', $s->spyingResponse);
        $parsed = json_decode($s->spyingResponse->getActualBody());
        $this->assertEquals(2, $parsed->numAffectedRows);
        $this->assertEquals(true, $parsed->lastInsertId !== '0');
    }
    private function verifyContentNodeWasInsertedToDb($s) {
        $this->assertEquals($s->newProduct->title, self::$db->fetchOne(
            'SELECT `title` FROM ${p}Products WHERE `id` = ?',
            [json_decode($s->spyingResponse->getActualBody())->lastInsertId]
        )['title']);
    }
    private function verifyRevisionWasInsertedToDb($s, $asDraft = false, $from = 'from-insert') {
        if ($from === 'from-insert')
            $this->verifyRevisionEquals($s->newProduct,
                                        $asDraft,
                                        json_decode($s->spyingResponse->getActualBody())
                                            ->lastInsertId,
                                        'Products');
        else
            $this->verifyRevisionEquals($s->newData,
                                        $asDraft,
                                        self::TEST_PRODUCT_1['id'],
                                        'Products');
    }


    ////////////////////////////////////////////////////////////////////////////


    public function testPOSTContentCreatesContentNodeAndRevisionAsCurrentDraft() {
        $s = $this->setupCreateContentTest();
        $s->newProduct->title .= '2';
        $this->sendCreateContentNodeRequest($s, '/as-draft');
        $this->verifyPOSTContentReturnedLastInsertId($s);
        $this->verifyContentNodeWasInsertedToDb($s);
        $this->verifyRevisionWasInsertedToDb($s, true);
    }
    private function verifyRevisionEquals($expectedSnapshot,
                                          $expectedIsCurrentDraft,
                                          $cNodeId,
                                          $cTypeName,
                                          $expectedIdx = 0) {
        $rows = self::$db->fetchAll(
            'SELECT `snapshot`, `isCurrentDraft` FROM ${p}contentRevisions' .
            ' WHERE `contentId` = ? AND `contentType` = ? ORDER BY `id` DESC',
            [$cNodeId, $cTypeName]
        );
        $actual = $rows[$expectedIdx];
        $actualSnapshot = json_decode($actual['snapshot']);
        $this->assertIsObject($actualSnapshot);
        $this->assertEquals($expectedSnapshot->title, $actualSnapshot->title);
        $this->assertEquals($expectedIsCurrentDraft ? 1 : 0, $actual['isCurrentDraft']);
    }


    ////////////////////////////////////////////////////////////////////////////


    public function testPUTContentUpdatesContentAndInsertsRevision() {
        $s = $this->setupUpdateContentTest();
        $this->insertTestProducts(self::TEST_PRODUCT_1);
        $this->sendUpdateContentNodeRequest($s);
        $this->verifyRespondedSuccesfullyWith('{"numAffectedRows":2}', $s);
        $this->verifyContentNodeWasUpdatedToDb($s);
        $this->verifyRevisionWasInsertedToDb($s, false, 'from-update');
    }
    private function setupUpdateContentTest() {
        $state = new \stdClass;
        $state->spyingResponse = null;
        $state->newData = (object)['title' => 'Päivitetty tuotteen nimi',
                                   'isDraft' => false];
        return $state;
    }
    private function sendUpdateContentNodeRequest($s, $urlTail = '') {
        $req = ApiRequestFactory::create("/api/content/" . self::TEST_PRODUCT_1['id'] .
                                         "/Products{$urlTail}",
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


    public function testPUTContentUpdatesRevisionInsteadOfContent() {
        $s = $this->setupUpdateDraftTest();
        $this->insertTestProducts(self::TEST_PRODUCT_1);
        $this->insertRevision(self::TEST_PRODUCT_1['id'], 'Products',
            json_encode(self::TEST_PRODUCT_1), true);
        $this->sendUpdateContentNodeRequest($s);
        $this->verifyRespondedSuccesfullyWith('{"numAffectedRows":2}', $s);
        $this->verifyPreviousDraftWasClearedFromDb($s);
        $this->verifyNewDraftWasInsertedToDb($s);
        $this->deleteAllRevisions();
    }
    private function setupUpdateDraftTest() {
        $state = $this->setupUpdateContentTest();
        $state->newData->title .= 2;
        $state->newData->isDraft = true;
        return $state;
    }
    private function verifyPreviousDraftWasClearedFromDb($s) {
        $this->verifyRevisionEquals((object) self::TEST_PRODUCT_1, false,
                                    self::TEST_PRODUCT_1['id'], 'Products', 1);
    }
    private function verifyNewDraftWasInsertedToDb($s) {
        $this->verifyRevisionEquals($s->newData, true, self::TEST_PRODUCT_1['id'],
                                    'Products', 0);
    }


    ////////////////////////////////////////////////////////////////////////////


    public function testPUTContentPublishesContent() {
        $s = $this->setupPublishContentTest();
        $p = self::TEST_PRODUCT_1;
        $p['status'] = DAO::STATUS_DRAFT;
        $this->insertTestProducts($p);
        $this->insertRevision(self::TEST_PRODUCT_1['id'], 'Products', true);
        $this->sendUpdateContentNodeRequest($s, '/publish');
        $this->verifyRespondedSuccesfullyWith('{"numAffectedRows":2}', $s);
        $this->verifyDraftWasClearedFromDb($s);
        $this->verifyContentNodeWasUpdatedToDb($s);
        $this->deleteAllRevisions();
    }
    private function setupPublishContentTest() {
        $s = $this->setupUpdateContentTest();
        $s->newData->title .= 3;
        $s->newData->isDraft = true;
        return $s;
    }
    private function verifyDraftWasClearedFromDb($s) {
        $this->assertEquals(null, self::$db->fetchOne(
            'SELECT `id` FROM ${p}contentRevisions' .
            ' WHERE `contentId` = ? AND `contentType` = ? AND `isCurrentDraft` = 1',
            [self::TEST_PRODUCT_1['id'], 'Products']
        ));
    }


    ////////////////////////////////////////////////////////////////////////////


    public function testPUTContentUnpublishesContent() {
        $s = $this->setupUnpublishContentTest();
        $this->insertTestProducts(self::TEST_PRODUCT_1);
        $this->sendUpdateContentNodeRequest($s, '/unpublish');
        $this->verifyRespondedSuccesfullyWith('{"numAffectedRows":1}', $s);
        $this->verifyRevisionWasInsertedToDb($s, true, 'from-update');
        $this->verifyContentNodeWasNotUpdatedToDb($s);
        $this->deleteAllRevisions();
    }
    private function setupUnpublishContentTest() {
        $s = $this->setupUpdateContentTest();
        $s->newData->title .= 4;
        return $s;
    }
    private function verifyContentNodeWasNotUpdatedToDb($s) {
        $this->verifyContentNodeFromDbEquals((object) self::TEST_PRODUCT_1);
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
        $req = ApiRequestFactory::create('/api/content/' . self::TEST_PRODUCT_1['id'] . '/Products',
                                         'DELETE');
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
