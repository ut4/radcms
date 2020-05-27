<?php

namespace RadCms\Tests\Packager;

use Pike\Auth\Authenticator;
use Pike\Request;
use Pike\TestUtils\DbTestCase;
use Pike\TestUtils\HttpTestUtils;
use Pike\TestUtils\MockCrypto;
use RadCms\AppContext;
use RadCms\Installer\Tests\BaseInstallerTest;
use RadCms\Packager\Packager;
use RadCms\Packager\ZipPackageStream;
use RadCms\Tests\_Internal\ContentTestUtils;
use RadCms\Tests\_Internal\MockPackageStream;
use RadCms\Tests\_Internal\TestSite;
use RadCms\Tests\User\UserControllersTest;

final class PackagerControllersTest extends DbTestCase {
    use HttpTestUtils;
    use ContentTestUtils;
    private $mockPackageStream;
    protected function setUp(): void {
        parent::setUp();
        $this->mockPackageStream = new MockPackageStream();
    }
    protected function tearDown(): void {
        parent::tearDown();
        UserControllersTest::deleteTestUsers();
    }
    public function testPOSTPackagerPacksWebsiteAndReturnsItAsAttachment() {
        $s = $this->setupCreatePackageTest();
        $this->sendCreatePackageRequest($s);
        $this->verifyPackageWasReturned($s);
        //
        $this->verifyEncryptedMainDataWasIncluded($s);
        $this->verifyDbAndSiteSettingsWereIncludedToMainData($s);
        $this->verifyContentTypesWereIncludedToMainData($s);
        $this->verifyAllContentWasIncludedToMainData($s);
        $this->verifyUserZeroWasIncludedToMainData($s);
        //
        $this->verifyPhpFilesFileListWasIncluded($s);
        $this->verifyThemeAssetsFileListWasIncluded($s);
        $this->verifyUploadsFileListWasIncluded($s);
        //
        $this->verifyPhpFilesWereIncluded($s);
        $this->verifyThemeAssetsWereIncluded($s);
        $this->verifyUploadsWereIncluded($s);
    }
    private function setupCreatePackageTest() {
        return (object) [
            'reqBody' => (object) [
                'templates' => json_encode(TestSite::TEMPLATES),
                'assets' => json_encode(TestSite::ASSETS),
                'uploads' => json_encode(TestSite::UPLOADS),
                'signingKey' => 'my-encrypt-key',
            ],
            'actualAttachmentBody' => '',
            'packageCreatedFromResponse' => null,
            'parsedMainDataFromPackage' => null,
            'testUserZero' => UserControllersTest::makeAndInsertTestUser(),
        ];
    }
    private function sendCreatePackageRequest($s) {
        $auth = $this->createMock(Authenticator::class);
        $auth->method('getIdentity')
             ->willReturn((object)['id' => $s->testUserZero->id,
                                   'role' => $s->testUserZero->role]);
        $ctx = new AppContext(['db' => '@auto']);
        $ctx->auth = $auth;
        $ctx->crypto = new MockCrypto;
        $app = $this->makeApp('\RadCms\App::create', $this->getAppConfig(), $ctx,
            function ($injector) {
                $injector->delegate(ZipPackageStream::class, function () {
                    return $this->mockPackageStream;
                });
            });
        $req = new Request('/api/packager', 'POST', $s->reqBody);
        $res = $this->createMockResponse($this->callback(function ($body) use ($s) {
                                            $s->actualAttachmentBody = $body ?? '';
                                            return true;
                                         }),
                                         200,
                                         'attachment');
        $this->sendRequest($req, $res, $app);
    }
    private function verifyPackageWasReturned($s) {
        $s->packageCreatedFromResponse = new MockPackageStream();
        $s->packageCreatedFromResponse->open('json://'. $s->actualAttachmentBody);
        $this->assertIsObject($s->packageCreatedFromResponse->getVirtualFiles());
    }
    private function verifyEncryptedMainDataWasIncluded($s) {
        $encodedJson = $s->packageCreatedFromResponse
            ->read(Packager::LOCAL_NAMES_MAIN_DATA);
        $decodedJson = MockCrypto::mockDecrypt($encodedJson);
        $parsed = json_decode($decodedJson);
        $this->assertIsObject($parsed);
        $this->assertEquals(['settings', 'contentTypes', 'content', 'user'],
                            array_keys((array) $parsed));
        $sorted = BaseInstallerTest::sortAclRules($parsed->settings->aclRules);
        $parsed->settings->aclRules = json_encode($sorted);
        $s->parsedMainDataFromPackage = $parsed;
    }
    private function verifyDbAndSiteSettingsWereIncludedToMainData($s) {
        $c = require TestSite::PUBLIC_PATH . 'config.php';
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
            'aclRules' => json_encode(BaseInstallerTest::sortAclRules(
                                          json_decode($row['aclRules'])
                                      )),
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
    private function verifyUserZeroWasIncludedToMainData($s) {
        $this->assertEquals($s->testUserZero,
                            $s->parsedMainDataFromPackage->user);
    }
    private function verifyPhpFilesFileListWasIncluded($s) {
        $fileListFileContents = $s->packageCreatedFromResponse
            ->read(Packager::LOCAL_NAMES_PHP_FILES_FILE_LIST);
        $this->assertEquals(json_encode(array_merge(['Site.php'],
                                                    TestSite::TEMPLATES)),
                            $fileListFileContents);
    }
    private function verifyThemeAssetsFileListWasIncluded($s) {
        $fileListFileContents = $s->packageCreatedFromResponse
            ->read(Packager::LOCAL_NAMES_ASSETS_FILE_LIST);
        $this->assertEquals(json_encode(TestSite::ASSETS),
                            $fileListFileContents);
    }
    private function verifyUploadsFileListWasIncluded($s) {
        $fileListFileContents = $s->packageCreatedFromResponse
            ->read(Packager::LOCAL_NAMES_UPLOADS_FILE_LIST);
        $this->assertEquals(json_encode(TestSite::UPLOADS),
                            $fileListFileContents);
    }
    private function verifyPhpFilesWereIncluded($s) {
        $base = RAD_PUBLIC_PATH . 'site/';
        $this->assertEquals($this->mockPackageStream->mockReadFile("{$base}Site.php"),
            $s->packageCreatedFromResponse->read('Site.php'));
        foreach (TestSite::TEMPLATES as $relativePath) {
            $this->assertEquals($this->mockPackageStream->mockReadFile("{$base}{$relativePath}"),
                $s->packageCreatedFromResponse->read($relativePath));
        }
    }
    private function verifyThemeAssetsWereIncluded($s) {
        $base = RAD_PUBLIC_PATH . 'site/';
        foreach (TestSite::ASSETS as $relativePath) {
            $this->assertEquals($this->mockPackageStream->mockReadFile("{$base}{$relativePath}"),
                $s->packageCreatedFromResponse->read($relativePath));
        }
    }
    private function verifyUploadsWereIncluded($s) {
        $base = RAD_PUBLIC_PATH . 'uploads/';
        foreach (TestSite::UPLOADS as $relativePath) {
            $this->assertEquals($this->mockPackageStream->mockReadFile("{$base}{$relativePath}"),
                $s->packageCreatedFromResponse->read($relativePath));
        }
    }
}
