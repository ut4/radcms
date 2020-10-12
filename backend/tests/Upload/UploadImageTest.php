<?php

declare(strict_types=1);

namespace RadCms\Tests\Upload;

use RadCms\Tests\_Internal\{ApiRequestFactory, TestSite};
use RadCms\Upload\{Uploader, UploadsRepository};

final class UploadImageTest extends UploadControllersTestCase {
    private const TEST_FILE_MIME = 'image/png';
    public function testUploadFileUploadsImage(): void {
        $state = $this->setupUploadFileTest();
        $this->sendUploadFileRequest($state);
        $this->verifyRespondedSuccesfullyWithNewFileInfo($state);
        $this->verifyMovedUploadedFileTo(RAD_PUBLIC_PATH . 'uploads/', $state);
        $this->verifyInsertedFileToDb($state);
    }
    private function setupUploadFileTest(): \stdClass {
        $state = new \stdClass;
        $state->uploadFileName = 'file.jpg';
        $state->actuallyMovedFileTo = null;
        $state->spyingResponse = null;
        $state->mockMoveUploadedFileFn = function ($_tmpFilePath, $targetFilePath) use ($state) {
            $state->actuallyMovedFileTo = $targetFilePath;
            return true;
        };
        return $state;
    }
    private function sendUploadFileRequest(\stdClass $s): void {
        $req = ApiRequestFactory::create('/api/uploads', 'POST', null,
            (object) ['localFile' => [
                'name' => $s->uploadFileName,
                'tmp_name' => dirname(__DIR__) . '/_Internal/upload-sample.png',
                'error' => UPLOAD_ERR_OK,
                'size' => 1
            ]], ['CONTENT_TYPE' => 'multipart/form-data; boundary=----WebKitFormBoundary1234567890123456']);
        $s->spyingResponse = $this->makeSpyingResponse();
        $app = $this->makeApp('\RadCms\App::create', $this->getAppConfig(),
                              '\RadCms\AppContext', function ($injector) use ($s) {
                                  $injector->delegate(Uploader::class, function () use ($s) {
                                      return new Uploader($s->mockMoveUploadedFileFn);
                                  });
                              });
        $this->sendRequest($req, $s->spyingResponse, $app);
    }
    private function verifyRespondedSuccesfullyWithNewFileInfo(\stdClass $s): void {
        $parsed = json_decode($s->spyingResponse->getActualBody());
        $actual = $parsed->file;
        $this->assertEquals($s->uploadFileName, $actual->fileName);
        $this->assertEquals(TEST_SITE_PUBLIC_PATH . 'uploads/', $actual->basePath);
        $this->assertEquals(self::TEST_FILE_MIME, $actual->mime);
        $this->assertEquals(null, $actual->friendlyName);
        $this->assertTrue($actual->createdAt > time() - 10);
        $this->assertEquals(null, $actual->updatedAt);
    }
    private function verifyMovedUploadedFileTo($expectedDir, $s): void {
        $this->assertEquals("{$expectedDir}{$s->uploadFileName}",
                            $s->actuallyMovedFileTo);
    }
    private function verifyInsertedFileToDb($s): void {
        $actual = (new UploadsRepository(self::$db))->getMany(null);
        $this->assertCount(1, $actual);
        $this->assertEquals($s->uploadFileName, $actual[0]->fileName);
        $this->assertEquals(TestSite::PUBLIC_PATH . 'uploads/', $actual[0]->basePath);
        $this->assertEquals(self::TEST_FILE_MIME, $actual[0]->mime);
        $this->assertEquals(null, $actual[0]->friendlyName);
        $this->assertTrue($actual[0]->createdAt > time() - 10);
        $this->assertEquals(0, $actual[0]->updatedAt);
    }
}
