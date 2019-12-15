<?php

namespace RadCms\Tests\Upload;

use Pike\TestUtils\DbTestCase;
use Pike\TestUtils\HttpTestUtils;
use Pike\Request;

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
}
