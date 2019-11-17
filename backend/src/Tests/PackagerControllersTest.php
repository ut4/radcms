<?php

namespace RadCms\Tests;

use RadCms\Tests\Self\DbTestCase;
use RadCms\Tests\Self\HttpTestUtils;
use RadCms\Tests\Self\PlainTextPackageStream;
use RadCms\Framework\Request;
use RadCms\Packager\ZipPackageStream;
use RadCms\Packager\Packager;

final class PackageControllersTest extends DbTestCase {
    use HttpTestUtils;
    public function testPOSTPackagerPacksWebsiteAndReturnsItAsAttachment() {
        $s = $this->setupCreatePackageTest();
        $this->setExpectedHttpAttachmentBody((new PlainTextPackageStream([
            Packager::MAIN_SCHEMA_VIRTUAL_FILE_NAME =>
                $this->getExpectedMainSchemaSqlContents(),
        ]))->getResult(), $s);
        $this->sendCreatePackageRequest($s);
    }
    private function setupCreatePackageTest() {
        return (object)[
            'expectedHttpAttachmentBody' => '',
        ];
    }
    private function setExpectedHttpAttachmentBody($contents, $s) {
        $s->expectedHttpAttachmentBody = $contents;
    }
    private function sendCreatePackageRequest($s) {
        $req = new Request('/api/packager/1234567890123', 'POST');
        $res = $this->createMockResponse($s->expectedHttpAttachmentBody,
                                         200,
                                         'attachment');
        $this->makeRequest($req, $res, null, function ($injector) {
            $injector->delegate(ZipPackageStream::class, function () {
                return new PlainTextPackageStream();
            });
        });
    }
    private function getExpectedMainSchemaSqlContents() {
        $out = file_get_contents(RAD_BASE_PATH . 'main-schema.mariadb.sql');
        $config = include __DIR__ . '/test-site/config.php';
        $out = str_replace('${database}', $config['db.database'], $out);
        return $out;
    }
}
