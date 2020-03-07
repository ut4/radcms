<?php

namespace RadCms\Tests\Packager;

use Pike\TestUtils\DbTestCase;
use Pike\TestUtils\HttpTestUtils;
use RadCms\Tests\_Internal\ContentTestUtils;
use RadCms\Packager\PlainTextPackageStream;
use Pike\Request;
use Pike\TestUtils\MockCrypto;
use RadCms\Packager\Packager;
use RadCms\ContentType\ContentTypeMigrator;
use RadCms\ContentType\ContentTypeCollection;

final class PackagerControllersTest extends DbTestCase {
    use HttpTestUtils;
    use ContentTestUtils;
    private static $migrator;
    private static $testSiteContentTypes;
    private static $testSiteContentTypesData;
    private $app;
    public static function setUpBeforeClass() {
        self::$testSiteContentTypesData = [
            ['SomeType', [(object)['name' => 'val1'], (object)['name' => 'val2']]],
            // AnotherTypellä ei sisältöä
        ];
        $parsed = json_decode(file_get_contents(TEST_SITE_PATH . 'content-types.json'));
        self::$testSiteContentTypes = ContentTypeCollection::fromCompactForm($parsed);
        self::$migrator = new ContentTypeMigrator(self::getDb());
        // @allow \Pike\PikeException
        self::$migrator->installMany(self::$testSiteContentTypes,
                                     self::$testSiteContentTypesData);
    }
    public static function tearDownAfterClass() {
        parent::tearDownAfterClass();
        // @allow \Pike\PikeException
        self::$migrator->uninstallMany(self::$testSiteContentTypes);
        self::clearInstalledContentTypesFromDb();
    }
    protected function setUp() {
        parent::setUp();
        $this->app = $this->makeApp('\RadCms\App::create', $this->getAppConfig());
    }
    public function testPOSTPackagerPacksWebsiteAndReturnsItAsAttachment() {
        $s = $this->setupCreatePackageTest();
        $this->sendCreatePackageRequest($s);
        $this->verifyReturnedSignedPackage($s);
        $this->verifyIncludedDbConfig($s);
        $this->verifyIncludedWebsiteState($s);
        $this->verifyIncludedContentTypesFile($s);
        $this->verifyIncludedThemeContentData($s);
    }
    private function setupCreatePackageTest() {
        $s = (object)[
            'mockCrypto' => new MockCrypto(),
            'actualAttachmentBody' => '',
            'actualPackage' => null,
            'testWebsiteState' => null,
        ];
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
        $this->app->getAppCtx()->crypto = $s->mockCrypto;
        $this->sendRequest($req, $res, $this->app);
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
    private function verifyIncludedContentTypesFile($s) {
        $this->assertEquals(self::makeExpectedPackageFile(Packager::THEME_CONTENT_TYPES_VIRTUAL_FILE_NAME),
                            $s->actualPackage->read(Packager::THEME_CONTENT_TYPES_VIRTUAL_FILE_NAME));
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
        $row = self::getDb()->fetchOne('SELECT * FROM ${p}cmsState');
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
                'doCreateDb' => true,
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
        if ($virtualFileName === Packager::THEME_CONTENT_TYPES_VIRTUAL_FILE_NAME) {
            return '{"SomeType":["Friendly name",{"name":["text","name","textField",""]},"Website"],'.
                    '"AnotherType":["Friendly eman",{"title":["text","title","textField",""]},"Website"]}';
        }
        throw new \RuntimeException("Unknown package file {$virtualFileName}");
    }
}
