<?php

namespace RadCms\Tests\Packager;

use RadCms\Tests\_Internal\DbTestCase;
use RadCms\Tests\_Internal\HttpTestUtils;
use RadCms\Tests\Installer\InstallerTest;
use RadCms\Packager\PlainTextPackageStream;
use Pike\Request;
use Pike\Auth\Crypto;
use RadCms\Tests\_Internal\MockCrypto;
use RadCms\Packager\Packager;
use RadCms\Website\SiteConfig;
use Pike\FileSystem;
use RadCms\ContentType\ContentTypeMigrator;

final class PackagerControllersTest extends DbTestCase {
    use HttpTestUtils;
    private static $testSiteCfg;
    private static $migrator;
    private static $testSiteContentTypesData;
    public static function setUpBeforeClass() {
        self::$testSiteContentTypesData = [
            ['SomeType', [(object)['name' => 'val1'], (object)['name' => 'val2']]],
            // AnotherTypellä ei sisältöä
        ];
        self::$testSiteCfg = new SiteConfig(new FileSystem);
        // @allow \Pike\PikeException
        self::$testSiteCfg->selfLoad(TEST_SITE_PATH . 'site.json', false, false);
        self::$migrator = new ContentTypeMigrator(self::getDb());
        // @allow \Pike\PikeException
        self::$migrator->installMany(self::$testSiteCfg->contentTypes,
                                     self::$testSiteContentTypesData);
    }
    public static function tearDownAfterClass($_ = null) {
        parent::tearDownAfterClass($_);
        // @allow \Pike\PikeException
        self::$migrator->uninstallMany(self::$testSiteCfg->contentTypes);
        InstallerTest::clearInstalledContentTypesFromDb();
    }
    public function testPOSTPackagerPacksWebsiteAndReturnsItAsAttachment() {
        $s = $this->setupCreatePackageTest();
        $this->sendCreatePackageRequest($s);
        $this->verifyReturnedSignedPackage($s);
        $this->verifyIncludedDbConfig($s);
        $this->verifyIncludedWebsiteState($s);
        $this->verifyIncludedSiteConfigFile($s);
        $this->verifyIncludedThemeContentData($s);
    }
    private function setupCreatePackageTest() {
        $s = (object)[
            'setupInjector' => null,
            'actualAttachmentBody' => '',
            'actualPackage' => null,
            'testWebsiteState' => null,
        ];
        $s->setupInjector = function ($injector) use ($s) {
            $injector->delegate(Crypto::class, function () {
                return new MockCrypto();
            });
        };
        return $s;
    }
    private function sendCreatePackageRequest($s) {
        $req = new Request('/api/packager', 'POST',
                           (object)['signingKey' => 'my-encrypt-key']);
        $res = $this->createMockResponse($this->callback(function ($body) use ($s) {
                                            $s->actualAttachmentBody = $body ?? '';
                                            return true;
                                         }),
                                         200,
                                         'attachment');
        $this->sendRequest($req, $res, null, $s->setupInjector);
    }
    private function verifyReturnedSignedPackage($s) {
        $this->assertTrue(strlen($s->actualAttachmentBody) > 0);
        $s->actualPackage = new PlainTextPackageStream();
        // @allow \Pike\PikeException
        $s->actualPackage->open(MockCrypto::mockDecrypt($s->actualAttachmentBody));
    }
    private function verifyIncludedDbConfig($s) {
        $s->testWebsiteState = self::makeTestWebsiteState();
        $vals = $s->testWebsiteState;
        $this->assertEquals(self::makeExpectedPackageFile(Packager::DB_CONFIG_VIRTUAL_FILE_NAME,
                                                          $s->testWebsiteState),
                            $s->actualPackage->read(Packager::DB_CONFIG_VIRTUAL_FILE_NAME));
    }
    private function verifyIncludedWebsiteState($s) {
        $this->assertEquals(self::makeExpectedPackageFile(Packager::WEBSITE_STATE_VIRTUAL_FILE_NAME,
                                                          $s->testWebsiteState),
                            $s->actualPackage->read(Packager::WEBSITE_STATE_VIRTUAL_FILE_NAME));
    }
    private function verifyIncludedSiteConfigFile($s) {
        $this->assertEquals(self::makeExpectedPackageFile(Packager::WEBSITE_CONFIG_VIRTUAL_FILE_NAME),
                            $s->actualPackage->read(Packager::WEBSITE_CONFIG_VIRTUAL_FILE_NAME));
    }
    private function verifyIncludedThemeContentData($s) {
        [, $someTypeData] = self::$testSiteContentTypesData[0];
        $actual = json_decode($s->actualPackage->read(Packager::THEME_CONTENT_DATA_VIRTUAL_FILE_NAME) ?? '¤');
        [, $actualData] = $actual[0];
        $this->assertCount(count($someTypeData), $actualData);
        $this->assertEquals($someTypeData[0]->name,
                            $actualData[0]->name);
        $this->assertEquals($someTypeData[1]->name,
                            $actualData[1]->name);
    }
    public static function makeTestWebsiteState() {
        $c = require TEST_SITE_PATH . 'config.php';
        $row = self::getDb()->fetchOne('SELECT * FROM ${p}websiteState');
        return (object)[
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
    public static function makeExpectedPackageFile($virtualFileName, $input=null) {
        if ($virtualFileName === Packager::DB_CONFIG_VIRTUAL_FILE_NAME) {
            return json_encode([
                'dbHost' => $input->dbHost, 'dbDatabase' => $input->dbDatabase,
                'dbUser' => $input->dbUser, 'dbPass' => $input->dbPass,
                'dbTablePrefix' => $input->dbTablePrefix, 'dbCharset' => $input->dbCharset,
            ], JSON_UNESCAPED_UNICODE);
        }
        if ($virtualFileName === Packager::WEBSITE_STATE_VIRTUAL_FILE_NAME) {
            return json_encode([
                'siteName' => $input->siteName,
                'siteLang' => $input->siteLang,
                'baseUrl' => RAD_BASE_URL,
                'radPath' => RAD_BASE_PATH,
                'sitePath' => RAD_SITE_PATH,
                'mainQueryVar' => RAD_QUERY_VAR,
                'useDevMode' => boolval(RAD_FLAGS & RAD_DEVMODE),
            ], JSON_UNESCAPED_UNICODE);
        }
        if ($virtualFileName === Packager::WEBSITE_CONFIG_VIRTUAL_FILE_NAME) {
            return file_get_contents(RAD_SITE_PATH . 'site.json');
        }
        throw new \RuntimeException("Unknown package file {$virtualFileName}");
    }
}
