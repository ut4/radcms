<?php

namespace RadCms\Tests\Packager;

use Pike\Auth\Authenticator;
use Pike\Request;
use Pike\TestUtils\DbTestCase;
use Pike\TestUtils\HttpTestUtils;
use Pike\TestUtils\MockCrypto;
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
        $this->verifyEncryptedMainDataWasIncluded($s);
        $this->verifyDbAndSiteSettingsWereIncludedToMainData($s);
        $this->verifyContentTypesWereIncludedToMainData($s);
        $this->verifyAllContentWasIncludedToMainData($s);
        $this->verifyUserZeroWasIncludedToMainData($s);
        $this->verifyTemplateFilesWereIncluded($s);
    }
    private function setupCreatePackageTest() {
        return (object) [
            'reqBody' => (object) [
                'templates' => json_encode(TestSite::TEMPLATES),
                'assets' => json_encode(TestSite::ASSETS),
                'signingKey' => 'my-encrypt-key'
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
        $app = $this->makeApp('\RadCms\App::create', $this->getAppConfig(),
            ['db' => '@auto', 'crypto' => new MockCrypto(), 'auth' => $auth],
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
        $c = require TestSite::PATH . 'config.php';
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
    private function verifyTemplateFilesWereIncluded($s) {
        $fileListFileContents = $s->packageCreatedFromResponse
            ->read(Packager::LOCAL_NAMES_TEMPLATES_FILEMAP);
        $this->assertEquals(json_encode(TestSite::TEMPLATES),
                            $fileListFileContents);
    }
    private function verifyIncludedThemeAssetFiles($s) {
        $fileListFileContents = $s->packageCreatedFromResponse
            ->read(Packager::LOCAL_NAMES_ASSETS_FILEMAP);
        $this->assertEquals(json_encode(TestSite::ASSETS),
                            $fileListFileContents);
    }
}
