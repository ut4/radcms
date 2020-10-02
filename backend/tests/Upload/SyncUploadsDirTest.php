<?php

declare(strict_types=1);

namespace RadCms\Tests\Upload;

use Pike\Request;
use RadCms\Tests\_Internal\TestSite;
use RadCms\Upload\UploadsRepository;

final class SyncUploadsDirTest extends UploadControllersTestCase {
    public function testRebuildIndexStoresContentsOfUploadsDirToDb(): void {
        $state = $this->setupSyncTest();
        $this->sendRebuildIndexRequest($state);
        $this->verifyRespondedSuccesfullyWith(['ok' => 'ok', 'numChanges' => 1], $state);
        $this->verifyInsertedUploadsDirContentsToDb($state);
    }
    private function setupSyncTest(): \stdClass {
        $state = new \stdClass;
        $state->spyingResponse = null;
        return $state;
    }
    private function sendRebuildIndexRequest(\stdClass $s): void {
        $req = new Request('/api/uploads/rebuild-index', 'PUT',
            (object) ['areYouSure' => 'yes, reduild everything']);
        $s->spyingResponse = $this->makeSpyingResponse();
        $app = $this->makeApp('\RadCms\App::create',
                              $this->getAppConfig(),
                              '\RadCms\AppContext');
        $this->sendRequest($req, $s->spyingResponse, $app);
    }
    private function verifyInsertedUploadsDirContentsToDb(\stdClass $s): void {
        $entries = (new UploadsRepository(self::$db))->getMany(null);
        $this->assertCount(1, $entries);
        $this->assertEquals(['fileName' => TestSite::UPLOAD_ITEM_1_PATH,
                             'basePath' => TestSite::PUBLIC_PATH . 'uploads/',
                             'mime' => TestSite::UPLOAD_ITEM_1_MIME,
                             'friendlyName' => null,
                             'createdAt' => TestSite::UPLOAD_ITEM_1_CTIME,
                             'updatedAt' => TestSite::UPLOAD_ITEM_1_MTIME,],
                            (array) $entries[0]);
    }
}
