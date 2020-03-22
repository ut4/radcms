<?php

namespace RadCms\Tests\Packager;

use Pike\Request;
use Pike\TestUtils\DbTestCase;
use Pike\TestUtils\HttpTestUtils;
use Pike\TestUtils\MockCrypto;
use RadCms\Auth\ACL;
use RadCms\Packager\Packager;
use RadCms\Packager\ZipPackageStream;
use RadCms\Tests\_Internal\ContentTestUtils;
use RadCms\Tests\_Internal\MockPackageStream;

final class PackagerControllersTest extends DbTestCase {
    use HttpTestUtils;
    use ContentTestUtils;
    private $mockPackageStream;
    private $app;
    protected function setUp(): void {
        parent::setUp();
        $this->mockPackageStream = new MockPackageStream();
        $this->app = $this->makeApp('\RadCms\App::create', $this->getAppConfig(), null,
            function ($injector) {
                $injector->delegate(ZipPackageStream::class, function () {
                    return $this->mockPackageStream;
                });
            });
    }
    public function testPOSTPackagerPacksWebsiteAndReturnsItAsAttachment() {
        $s = $this->setupCreatePackageTest();
        $this->sendCreatePackageRequest($s);
        $this->verifyPackageWasReturned($s);
        $this->verifyEncryptedMainDataWasIncluded($s);
        $this->verifyDbAndSiteSettingsWereIncludedToMainData($s);
        $this->verifyContentTypesWereIncludedToMainData($s);
        $this->verifyAllContentWasIncludedToMainData($s);
        $this->verifyUserWasIncludedToMainData($s);
        $this->verifyTemplateFilesWereIncluded($s);
    }
    private function setupCreatePackageTest() {
        return (object) [
            'reqBody' => (object) [
                'templates' => json_encode(['test-layout1.tmpl.php',
                                            'test-layout2.tmpl.php']),
                'themeAssets' => json_encode(['test-styles1.css',
                                              'test-styles2.css']),
                'signingKey' => 'my-encrypt-key'
            ],
            'actualAttachmentBody' => '',
            'packageCreatedFromResponse' => null,
            'parsedMainDataFromPackage' => null,
        ];
    }
    private function sendCreatePackageRequest($s) {
        $req = new Request('/api/packager', 'POST', $s->reqBody);
        $res = $this->createMockResponse($this->callback(function ($body) use ($s) {
                                            $s->actualAttachmentBody = $body ?? '';
                                            return true;
                                         }),
                                         200,
                                         'attachment');
        $this->app->getAppCtx()->crypto = new MockCrypto();
        $this->sendRequest($req, $res, $this->app);
    }
    private function verifyPackageWasReturned($s) {
        $s->packageCreatedFromResponse = new MockPackageStream();
        $s->packageCreatedFromResponse->open('json://'. $s->actualAttachmentBody);
        $this->assertIsObject($s->packageCreatedFromResponse->getVirtualFiles());
    }
    private function verifyEncryptedMainDataWasIncluded($s) {
        $encodedJson = $s->packageCreatedFromResponse
            ->read(Packager::MAIN_DATA_LOCAL_NAME);
        $decodedJson = MockCrypto::mockDecrypt($encodedJson);
        $parsed = json_decode($decodedJson);
        $this->assertIsObject($parsed);
        $this->assertEquals(['settings', 'contentTypes', 'content', 'user'],
                            array_keys((array) $parsed));
        $s->parsedMainDataFromPackage = $parsed;
    }
    private function verifyDbAndSiteSettingsWereIncludedToMainData($s) {
        $c = require TEST_SITE_PATH . 'config.php';
        $row = self::getDb()->fetchOne('SELECT * FROM ${p}cmsState');
        $this->assertEquals((object) [
            'dbHost' => $c['db.host'],
            'dbDatabase' => $c['db.database'],
            'doCreateDb' => true,
            'dbUser' => $c['db.user'],
            'dbPass' => $c['db.pass'],
            'dbTablePrefix' => $c['db.tablePrefix'],
            'dbCharset' => $c['db.charset'],
            //
            'siteName' => $row['name'],
            'siteLang' => $row['lang'],
            'mainQueryVar' => RAD_QUERY_VAR,
            'useDevMode' => boolval(RAD_FLAGS & RAD_DEVMODE),
        ], $s->parsedMainDataFromPackage->settings);
    }
    private function verifyContentTypesWereIncludedToMainData($s) {
        $this->assertEquals([], $s->parsedMainDataFromPackage->contentTypes);
    }
    private function verifyAllContentWasIncludedToMainData($s) {
        $this->assertEquals([], $s->parsedMainDataFromPackage->content);
    }
    private function verifyUserWasIncludedToMainData($s) {
        $this->assertEquals((object) [
            'id' => 'todo',
            'username' => 'todo',
            'email' => 'todo',
            'passwordHash' => 'todo',
            'role' => ACL::ROLE_SUPER_ADMIN,
        ], $s->parsedMainDataFromPackage->user);
    }
    private function verifyTemplateFilesWereIncluded($s) {
        $fileListFileContents = $s->packageCreatedFromResponse
            ->read(Packager::TEMPLATE_FILE_NAMES_LOCAL_NAME);
        $this->assertEquals(json_encode(['test-layout1.tmpl.php',
                                         'test-layout2.tmpl.php']),
                            $fileListFileContents);
    }
    private function verifyIncludedThemeAssetFiles($s) {
        $fileListFileContents = $s->packageCreatedFromResponse
            ->read(Packager::THEME_ASSET_FILE_NAMES_LOCAL_NAME);
        $this->assertEquals(json_encode(['test-styles1.css',
                                         'test-styles2.css']),
                            $fileListFileContents);
    }
}
