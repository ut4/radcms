<?php

namespace RadCms\Tests\Upload;

use Pike\TestUtils\DbTestCase;
use Pike\TestUtils\HttpTestUtils;
use Pike\Request;
use RadCms\Upload\Uploader;

final class UploadControllersTest extends DbTestCase {
    use HttpTestUtils;
    public function testGETUploadsReturnsListOfFiles() {
        $s = $this->setupListUploadsTest();
        $this->sendGetUploadsRequest($s);
        $this->verifyResponseBodyEquals([(object)['fileName' => 'sample.jpg',
                                                  'basePath' => TEST_SITE_PATH . 'uploads/',
                                                  'mime' => 'image/jpeg']], $s);
    }
    private function setupListUploadsTest() {
        return (object)[
            'actualResponseBody' => null,
        ];
    }
    private function sendGetUploadsRequest($s) {
        $req = new Request('/api/uploads', 'GET');
        $this->sendResponseBodyCapturingRequest($req, '\RadCms\App::create', $s);
    }
    private function verifyResponseBodyEquals($expected, $s) {
        $this->assertEquals(json_encode($expected),
                            $s->actualResponseBody);
    }


    ////////////////////////////////////////////////////////////////////////////


    public function testPOSTUploadsUploadsFile() {
        $s = $this->setupUploadFileTest();
        $this->sendUploadFileRequest($s);
        $this->verifyMovedUploadedFileTo(RAD_SITE_PATH . 'uploads/', $s);
    }
    private function setupUploadFileTest() {
        $s = (object)[
            'uploadFileName' => 'file.jpg',
            'actuallyMovedFileTo' => '',
            'mockMoveUploadedFileFn' => null,
        ];
        $s->mockMoveUploadedFileFn = function ($_tmpFilePath, $targetFilePath) use ($s) {
            $s->actuallyMovedFileTo = $targetFilePath;
            return true;
        };
        return $s;
    }
    private function sendUploadFileRequest($s) {
        $reqBody = (object)['returnTo' => 'http://localhost/foo'];
        $req = new Request('/api/uploads', 'POST',
                           $reqBody,
                           (object)['localFile' => [
                               'name' => $s->uploadFileName,
                               'tmp_name' => dirname(__DIR__) . '/_Internal/upload-sample.png',
                               'error' => UPLOAD_ERR_OK,
                               'size' => 1
                           ]]);
        $res = $this->createMockResponse($reqBody->returnTo, 200, 'redirect');
        $this->sendRequest($req, $res, '\RadCms\App::create', null, function ($injector) use ($s) {
            $injector->delegate(Uploader::class, function () use ($s) {
                return new Uploader($s->mockMoveUploadedFileFn);
            });
        });
    }
    private function verifyMovedUploadedFileTo($expectedDir, $s) {
        $this->assertEquals("{$expectedDir}{$s->uploadFileName}",
                            $s->actuallyMovedFileTo);
    }
}
