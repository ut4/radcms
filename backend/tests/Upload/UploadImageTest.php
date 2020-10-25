<?php

declare(strict_types=1);

namespace RadCms\Tests\Upload;

use RadCms\Tests\_Internal\{ApiRequestFactory, TestSite};
use RadCms\Upload\{Uploader, UploadsRepository};

final class UploadImageTest extends UploadControllersTestCase {
    private const TEST_FILE_NAME = 'file.jpg';
    private const TEST_FILE_MIME = 'image/png';
    public function testUploadFileRejectsInvalidInput(): void {
        $state = $this->setupInputValidationTest();
        $this->sendUploadFileRequest($state);
        $this->verifyResponseMetaEquals(400, 'application/json', $state->spyingResponse);
        $this->verifyResponseBodyEquals([
            'fileName must be string',
            'The length of fileName must be 255 or less',
        ], $state->spyingResponse);
    }
    private function setupInputValidationTest(): \stdClass {
        $state = new \stdClass;
        $state->spyingResponse = null;
        $state->reqBody = (object) ['fileName' => ['not-a-string']];
        $state->mockMoveUploadedFileFn = null;
        return $state;
    }
    private function sendUploadFileRequest(\stdClass $s): void {
        $req = ApiRequestFactory::create('/api/uploads', 'POST', $s->reqBody,
            (object) ['localFile' => [
                'name' => self::TEST_FILE_NAME,
                'tmp_name' => dirname(__DIR__) . '/_Internal/upload-sample.png',
                'error' => UPLOAD_ERR_OK,
                'size' => 1
            ]], ['CONTENT_TYPE' => 'multipart/form-data; boundary=----WebKitFormBoundary1234567890123456']);
        $s->spyingResponse = $this->makeSpyingResponse();
        $app = $this->makeApp('\RadCms\App::create', $this->getAppConfig(),
                              '\RadCms\AppContext', $s->mockMoveUploadedFileFn ? function ($injector) use ($s) {
                                  $injector->delegate(Uploader::class, function () use ($s) {
                                      return new Uploader($s->mockMoveUploadedFileFn);
                                  });
                              } : null);
        $this->sendRequest($req, $s->spyingResponse, $app);
    }


    ////////////////////////////////////////////////////////////////////////////


    public function testUploadFileUploadsImage(): void {
        $state = $this->setupUploadFileTest();
        $this->sendUploadFileRequest($state);
        $this->verifyRespondedSuccesfullyWithNewFileInfo(self::TEST_FILE_NAME, $state);
        $this->verifyMovedUploadedFileTo(RAD_PUBLIC_PATH . 'uploads/' . self::TEST_FILE_NAME,
                                         $state);
        $this->verifyInsertedFileToDb(self::TEST_FILE_NAME, $state);
    }
    private function setupUploadFileTest(): \stdClass {
        $state = $this->setupInputValidationTest();
        $state->actuallyMovedFileTo = null;
        $state->mockMoveUploadedFileFn = function ($_tmpFilePath, $targetFilePath) use ($state) {
            $state->actuallyMovedFileTo = $targetFilePath;
            return true;
        };
        $state->reqBody = (object) ['fileName' => ''];
        return $state;
    }
    private function verifyRespondedSuccesfullyWithNewFileInfo(string $expectedFileName,
                                                               \stdClass $s): void {
        $this->verifyResponseMetaEquals(200, 'application/json', $s->spyingResponse);
        $parsed = json_decode($s->spyingResponse->getActualBody());
        $actual = $parsed->file;
        $this->assertEquals($expectedFileName, $actual->fileName);
        $this->assertEquals(TEST_SITE_PUBLIC_PATH . 'uploads/', $actual->basePath);
        $this->assertEquals(self::TEST_FILE_MIME, $actual->mime);
        $this->assertEquals(null, $actual->friendlyName);
        $this->assertTrue($actual->createdAt > time() - 10);
        $this->assertEquals(null, $actual->updatedAt);
    }
    private function verifyMovedUploadedFileTo($expectedFilePath, $s): void {
        $this->assertEquals($expectedFilePath,
                            $s->actuallyMovedFileTo);
    }
    private function verifyInsertedFileToDb(string $expectedFileName, $s): void {
        $actual = (new UploadsRepository(self::$db))->getMany(null);
        $this->assertCount(1, $actual);
        $this->assertEquals($expectedFileName, $actual[0]->fileName);
        $this->assertEquals(TestSite::PUBLIC_PATH . 'uploads/', $actual[0]->basePath);
        $this->assertEquals(self::TEST_FILE_MIME, $actual[0]->mime);
        $this->assertEquals(null, $actual[0]->friendlyName);
        $this->assertTrue($actual[0]->createdAt > time() - 10);
        $this->assertEquals(0, $actual[0]->updatedAt);
    }


    ////////////////////////////////////////////////////////////////////////////


    public function testUploadFileUsesInputFileNameAsTargetFileName(): void {
        $state = $this->setupUploadFileWithCustomNameTest();
        $this->sendUploadFileRequest($state);
        $this->verifyRespondedSuccesfullyWithNewFileInfo($state->reqBody->fileName,
                                                         $state);
        $this->verifyMovedUploadedFileTo(RAD_PUBLIC_PATH . "uploads/{$state->reqBody->fileName}",
                                         $state);
        $this->verifyInsertedFileToDb($state->reqBody->fileName, $state);
    }
    private function setupUploadFileWithCustomNameTest(): \stdClass {
        $state = $this->setupUploadFileTest();
        $state->reqBody = (object) ['fileName' => 'my-target-file-name.png'];
        return $state;
    }
}
