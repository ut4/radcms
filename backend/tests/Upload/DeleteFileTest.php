<?php

declare(strict_types=1);

namespace RadCms\Tests\Upload;

use Pike\FileSystem;
use RadCms\Tests\_Internal\{ApiRequestFactory, TestSite};

final class DeleteFileTest extends UploadControllersTestCase {
    public function testDeleteFileDeletesFileFromDatabaseAndDisk(): void {
        $state = $this->setupDeleteTest();
        $this->dbDataHelper->insertData($state->testFiles, 'files');
        $this->sendDeleteFileRequest($state);
        $this->verifyResponseMetaEquals(200, 'application/json', $state->spyingResponse);
        $this->verifyDeletedFileFromDb($state);
        $this->verifyDeletedFileFromDisk($state);
    }
    private function setupDeleteTest(): \stdClass {
        $state = new \stdClass;
        $state->spyingResponse = null;
        $state->testFiles = [
            (object) ['fileName' => 'a-cat.jpg',
                      'basePath' => TestSite::PUBLIC_PATH . 'uploads/',
                      'mime' => 'image/jpg',
                      'createdAt' => '1320969601',
                      'updatedAt' => '0'],
        ];
        $this->actuallyDeletedFilePath = '';
        return $state;
    }
    private function sendDeleteFileRequest(\stdClass $s): void {
        $req = ApiRequestFactory::create('/api/uploads/' . urlencode($s->testFiles[0]->fileName) .
            '/' . urlencode($s->testFiles[0]->basePath), 'DELETE');
        $s->spyingResponse = $this->makeSpyingResponse();
        $app = $this->makeApp('\RadCms\App::create',
                              $this->getAppConfig(),
                              '\RadCms\AppContext',
                              function ($injector) use ($s) {
                                  $injector->delegate(FileSystem::class, function () use ($s) {
                                      return $this->makeFsThatDeletesFileSuccesfully($s);
                                  });
                              });
        $this->sendRequest($req, $s->spyingResponse, $app);
    }
    private function makeFsThatDeletesFileSuccesfully(\stdClass $s) {
        $out = $this->createMock(FileSystem::class);
        $out->method('isFile')->willReturn(true);
        $out->method('unlink')->with($this->callback(function ($filePath) use ($s) {
            $s->actuallyDeletedFilePath = $filePath;
            return true;
        }))->willReturn(true);
        return $out;
    }
    private function verifyDeletedFileFromDb(\stdClass $s): void {
        $actual = $this->dbDataHelper->getRow('files',
                                              'fileName = ?',
                                              [$s->testFiles[0]->fileName]);
        $this->assertNull($actual);
    }
    private function verifyDeletedFileFromDisk(\stdClass $s): void {
        $this->assertEquals(TestSite::PUBLIC_PATH . 'uploads/' . $s->testFiles[0]->fileName,
                            $s->actuallyDeletedFilePath);
    }
}


