<?php

namespace RadCms\Tests\Upload;

use Pike\Request;
use Pike\TestUtils\{DbTestCase, HttpTestUtils};
use RadCms\Upload\Uploader;

final class UploadControllersTest extends DbTestCase {
    use HttpTestUtils;
    public function testGETUploadsReturnsListOfFiles() {
        $s = $this->setupListUploadsTest();
        $this->sendGetUploadsRequest($s);
        $this->verifyRespondedSuccesfullyWith([
            (object)['fileName' => 'sample.jpg',
                     'basePath' => TEST_SITE_PUBLIC_PATH . 'uploads/',
                     'mime' => 'image/jpeg']], $s);
    }
    private function setupListUploadsTest() {
        $state = new \stdClass;
        $state->spyingResponse = null;
        return $state;
    }
    private function sendGetUploadsRequest($s) {
        $req = new Request('/api/uploads', 'GET');
        $s->spyingResponse = $this->makeSpyingResponse();
        $app = $this->makeApp('\RadCms\App::create',
                              $this->getAppConfig(),
                              '\RadCms\AppContext');
        $this->sendRequest($req, $s->spyingResponse, $app);
    }


    ////////////////////////////////////////////////////////////////////////////


    public function testPOSTUploadsUploadsFile() {
        $s = $this->setupUploadFileTest();
        $this->sendUploadFileRequest($s);
        $this->verifyRespondedSuccesfullyWith((object) [
            'file' => (object)['fileName' => $s->uploadFileName,
                               'basePath' => TEST_SITE_PUBLIC_PATH . 'uploads/',
                               'mime' => 'image/png']
        ], $s);
        $this->verifyMovedUploadedFileTo(RAD_PUBLIC_PATH . 'uploads/', $s);
    }
    private function setupUploadFileTest() {
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
    private function sendUploadFileRequest($s) {
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
    private function verifyMovedUploadedFileTo($expectedDir, $s) {
        $this->assertEquals("{$expectedDir}{$s->uploadFileName}",
                            $s->actuallyMovedFileTo);
    }
    private function verifyRespondedSuccesfullyWith($expected, $s) {
        $this->verifyResponseMetaEquals(200, 'application/json', $s->spyingResponse);
        $this->verifyResponseBodyEquals($expected, $s->spyingResponse);
    }
}
