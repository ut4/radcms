<?php

declare(strict_types=1);

namespace RadCms\Tests\Upload;

use Pike\Request;
use RadCms\Upload\Uploader;

final class UploadImageTest extends UploadControllersTestCase {
    public function testUploadFileUploadsImage(): void {
        $state = $this->setupUploadFileTest();
        $this->sendUploadFileRequest($state);
        $this->verifyRespondedSuccesfullyWith((object) [
            'file' => (object)['fileName' => $state->uploadFileName,
                               'basePath' => TEST_SITE_PUBLIC_PATH . 'uploads/',
                               'mime' => 'image/png',
                               'friendlyName' => null,
                               'createdAt' => null,
                               'updatedAt' => null]
        ], $state);
        $this->verifyMovedUploadedFileTo(RAD_PUBLIC_PATH . 'uploads/', $state);
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
        $req = new Request('/api/uploads', 'POST', null,
                           (object)['localFile' => [
                               'name' => $s->uploadFileName,
                               'tmp_name' => dirname(__DIR__) . '/_Internal/upload-sample.png',
                               'error' => UPLOAD_ERR_OK,
                               'size' => 1
                           ]]);
        $s->spyingResponse = $this->makeSpyingResponse();
        $app = $this->makeApp('\RadCms\App::create', $this->getAppConfig(),
                              '\RadCms\AppContext', function ($injector) use ($s) {
                                  $injector->delegate(Uploader::class, function () use ($s) {
                                      return new Uploader($s->mockMoveUploadedFileFn);
                                  });
                              });
        $this->sendRequest($req, $s->spyingResponse, $app);
    }
    private function verifyMovedUploadedFileTo($expectedDir, $s): void {
        $this->assertEquals("{$expectedDir}{$s->uploadFileName}",
                            $s->actuallyMovedFileTo);
    }
}
