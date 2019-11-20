<?php

namespace RadCms\Tests;

use RadCms\Tests\Self\DbTestCase;
use RadCms\Tests\Self\HttpTestUtils;
use RadCms\Packager\PlainTextPackageStream;
use RadCms\Framework\Request;
use RadCms\Auth\Crypto;
use RadCms\Tests\Self\MockCrypto;
use RadCms\Packager\Packager;

final class PackagerControllersTest extends DbTestCase {
    use HttpTestUtils;
    public function testPOSTPackagerPacksWebsiteAndReturnsItAsAttachment() {
        $s = $this->setupCreatePackageTest();
        $this->setExpectedHttpAttachmentBody(self::makeExpectedPackage()->getResult(), $s);
        $this->sendCreatePackageRequest($s);
    }
    private function setupCreatePackageTest() {
        $s = (object)[
            'expectedHttpAttachmentBody' => '',
            'setupInjector' => null,
        ];
        $s->setupInjector = function ($injector) use ($s) {
            $injector->delegate(Crypto::class, function () {
                return new MockCrypto();
            });
        };
        return $s;
    }
    private function setExpectedHttpAttachmentBody($contents, $s) {
        $s->expectedHttpAttachmentBody = MockCrypto::mockEncrypt($contents);
    }
    private function sendCreatePackageRequest($s) {
        $req = new Request('/api/packager', 'POST',
                           (object)['signingKey' => 'my-encrypt-key']);
        $res = $this->createMockResponse($s->expectedHttpAttachmentBody,
                                         200,
                                         'attachment');
        $this->makeRequest($req, $res, null, $s->setupInjector);
    }
    public static function makeExpectedPackage($vals = null) {
        if (!$vals) {
            $c = include __DIR__ . '/test-site/config.php';
            $row = self::getDb()->fetchOne('SELECT * FROM ${p}websiteState');
            $vals = (object)[
                'siteName' => $row['name'],
                'siteLang' => $row['lang'],
                'dbHost' => $c['db.host'],
                'dbDatabase' => $c['db.database'],
                'dbUser' => $c['db.user'],
                'dbPass' => $c['db.pass'],
                'dbTablePrefix' => $c['db.tablePrefix'],
                'dbCharset' => $c['db.charset'],
            ];
        }
        return new PlainTextPackageStream([
            Packager::DB_CONFIG_VIRTUAL_FILE_NAME => json_encode([
                'dbHost' => $vals->dbHost, 'dbDatabase' => $vals->dbDatabase,
                'dbUser' => $vals->dbUser, 'dbPass' => $vals->dbPass,
                'dbTablePrefix' => $vals->dbTablePrefix, 'dbCharset' => $vals->dbCharset,
            ]),
            Packager::WEBSITE_STATE_VIRTUAL_FILE_NAME => json_encode([
                'siteName' => $vals->siteName,
                'siteLang' => $vals->siteLang,
                'baseUrl' => RAD_BASE_URL,
                'radPath' => RAD_BASE_PATH,
                'sitePath' => RAD_SITE_PATH,
                'mainQueryVar' => RAD_QUERY_VAR,
                'useDevMode' => boolval(RAD_FLAGS & RAD_DEVMODE),
            ]),
        ]);
    }
}
