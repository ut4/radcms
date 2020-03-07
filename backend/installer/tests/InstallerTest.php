<?php

namespace RadCms\Installer\Tests;

use Pike\TestUtils\DbTestCase;
use Pike\TestUtils\HttpTestUtils;
use Pike\Request;
use Pike\App;
use Pike\FileSystem;
use RadCms\Installer\Module;
use RadCms\Tests\_Internal\ContentTestUtils;
use Pike\TestUtils\MockCrypto;
use RadCms\Packager\Packager;
use RadCms\Packager\PlainTextPackageStream;
use RadCms\Tests\Packager\PackagerControllersTest;
use RadCms\Auth\ACL;
use RadCms\Installer\Installer;

final class InstallerTest extends DbTestCase {
    use HttpTestUtils;
    use ContentTestUtils;
    const TEST_DB_NAME1 = 'radInstallerTestDb1';
    const TEST_DB_NAME2 = 'radInstallerTestDb2';
    const TEST_DB_NAME3 = 'radInstallerTestDb3';
    public function setUp() {
        parent::setUp();
        if (!defined('INDEX_DIR_PATH')) {
            define('INDEX_DIR_PATH', RAD_SITE_PATH);
        }
    }
    public static function tearDownAfterClass() {
        parent::tearDownAfterClass();
        self::$db->exec('DROP DATABASE IF EXISTS ' . self::TEST_DB_NAME1 .
                        ';DROP DATABASE IF EXISTS ' . self::TEST_DB_NAME2 .
                        ';DROP DATABASE IF EXISTS ' . self::TEST_DB_NAME3);
    }
    public function testInstallerValidatesMissingValues() {
        $input = (object)['sampleContent' => 'test-content'];
        $res = $this->createMockResponse(json_encode([
            'siteName must be string',
            'The value of siteLang was not in the list',
            'useDevMode must be bool',
            'The length of dbHost must be at least 1',
            'The length of dbUser must be at least 1',
            'dbPass must be string',
            'The length of dbDatabase must be at least 1',
            'doCreateDb must be bool',
            'The value of dbCharset was not in the list',
            'The length of firstUserName must be at least 1',
            'firstUserPass must be string',
            'The length of baseUrl must be at least 1',
        ]), 400);
        $app = $this->makeApp([$this,'createInstallerApp'], $this->getAppConfig());
        $this->sendRequest(new Request('/', 'POST', $input), $res, $app);
    }
    public function testInstallerValidatesInvalidValues() {
        $input = (object)[
            'siteName' => new \stdClass,
            'siteLang' => [],
            'sampleContent' => 'foo',
            'mainQueryVar' => '%&"¤',
            'useDevMode' => 'not-bool',
            'dbHost' => [],
            'dbUser' => [],
            'dbPass' => [],
            'dbDatabase' => [],
            'doCreateDb' => 'not-bool',
            'dbTablePrefix' => new \stdClass,
            'dbCharset' => 'notValid',
            'firstUserName' => [],
            'firstUserEmail' => new \stdClass,
            'firstUserPass' => [],
            'baseUrl' => [],
        ];
        $res = $this->createMockResponse(json_encode([
            'siteName must be string',
            'The value of siteLang was not in the list',
            'The value of sampleContent was not in the list',
            'mainQueryVar must contain only [a-zA-Z0-9_] and start with [a-zA-Z_]',
            'useDevMode must be bool',
            'The length of dbHost must be at least 1',
            'The length of dbUser must be at least 1',
            'dbPass must be string',
            'The length of dbDatabase must be at least 1',
            'doCreateDb must be bool',
            'dbTablePrefix must be string',
            'The length of dbTablePrefix must be at least 1',
            'The value of dbCharset was not in the list',
            'The length of firstUserName must be at least 1',
            'firstUserEmail must be string',
            'The length of firstUserEmail must be at least 3',
            'firstUserPass must be string',
            'The length of baseUrl must be at least 1'
        ]), 400);
        $app = $this->makeApp([$this,'createInstallerApp'], $this->getAppConfig());
        $this->sendRequest(new Request('/', 'POST', $input), $res, $app);
    }
    public function testInstallerFillsDefaultValues() {
        $input = (object)[
            'siteName' => '',
            'siteLang' => 'fi_FI',
            'sampleContent' => 'test-content',
            'mainQueryVar' => '',
            'useDevMode' => false,
            'dbHost' => 'locahost',
            'dbUser' => 'test',
            'dbPass' => 'pass',
            'dbDatabase' => 'name',
            'doCreateDb' => false,
            'dbTablePrefix' => 'p_',
            'dbCharset' => 'utf8',
            'firstUserName' => 'user',
            'firstUserPass' => 'pass',
            'baseUrl' => '/',
        ];
        $res = $this->createMockResponse($this->anything());
        $app = $this->makeApp([$this,'createInstallerApp'], $this->getAppConfig(),
            null, function ($injector) {
                $injector->delegate(Installer::class, function() {
                    $m = $this->createMock(Installer::class);
                    $m->method('doInstall')->willReturn(true);
                    $m->method('getWarnings')->willReturn([]);
                    return $m;
                });
            });
        $this->sendRequest(new Request('/', 'POST', $input), $res, $app);
        $this->assertEquals('My Site', $input->siteName);
        $this->assertEquals('', $input->mainQueryVar);
        $this->assertEquals(false, $input->useDevMode);
    }
    public function testInstallerCreatesDbSchemaAndInsertsSampleContent() {
        $s = $this->setupInstallerTest1();
        $this->addFsExpectation('readsDataFiles', $s);
        $this->addFsExpectation('readsSampleContentFiles', $s);
        $this->addFsExpectation('createsSiteDirs', $s);
        $this->addFsExpectation('clonesTemplateFilesAndSiteCfgFile', $s);
        $this->addFsExpectation('generatesConfigFile', $s);
        $this->addFsExpectation('deletesInstallerFiles', $s);
        $this->sendInstallRequest($s);
        $this->verifyCreatedMainSchema($s);
        $this->verifyInsertedMainSchemaData($s);
        $this->verifyCreatedUserZero($s);
        $this->verifyContentTypeIsInstalled('Movies', true);
        $this->verifyInsertedSampleContent($s);
    }
    private function setupInstallerTest1() {
        $config = require TEST_SITE_PATH . 'config.php';
        return (object) [
            'input' => (object) [
                'siteName' => '',
                'siteLang' => 'en_US',
                'sampleContent' => 'test-content',
                'mainQueryVar' => '',
                'useDevMode' => true,
                'dbHost' => $config['db.host'],
                'dbUser' => $config['db.user'],
                'dbPass' => $config['db.pass'],
                'dbDatabase' => self::TEST_DB_NAME1,
                'doCreateDb' => true,
                'dbTablePrefix' => 'p_',
                'dbCharset' => 'utf8',
                'firstUserName' => 'user',
                'firstUserEmail' => 'user@mail.com',
                'firstUserPass' => 'pass',
                'baseUrl' => '/foo/',
            ],
            'backendPath' => RAD_BASE_PATH,
            'siteDirPath' => INDEX_DIR_PATH,
            'sampleContentDirPath' => RAD_BASE_PATH . 'installer/sample-content/test-content/',
            'mockFs' => $this->createMock(FileSystem::class)
        ];
    }
    private function addFsExpectation($expectation, $s) {
        if ($expectation === 'readsDataFiles') {
            $s->mockFs->expects($this->exactly(3))
                ->method('read')
                ->withConsecutive(
                    ["{$s->backendPath}installer/schema.mariadb.sql"],
                    ["{$s->sampleContentDirPath}content-types.json"],
                    ["{$s->sampleContentDirPath}sample-data.json"]
                )
                ->willReturnOnConsecutiveCalls(
                    file_get_contents("{$s->backendPath}installer/schema.mariadb.sql"),
                    //
                    '{' .
                        '"Movies": ["Elokuvat", {"title": "text"}]' .
                    '}',
                    //
                    '[' .
                        '["Movies", [{"title": "Foo"}, {"title": "Bar"}]]' .
                    ']'
                );
            return;
        }
        if ($expectation === 'readsSampleContentFiles') {
            $s->mockFs->expects($this->exactly(3))
                ->method('readDir')
                ->withConsecutive(
                    ["{$s->sampleContentDirPath}theme/", '*.tmpl.php'],
                    ["{$s->sampleContentDirPath}theme/frontend/", '*.{css,js}', $this->anything()],
                    ["{$s->backendPath}installer"] // @selfDestruct
                )
                ->willReturnOnConsecutiveCalls([
                    "{$s->sampleContentDirPath}theme/main.tmpl.php",
                    "{$s->sampleContentDirPath}theme/Another.tmpl.php"
                ], [
                    "{$s->sampleContentDirPath}theme/frontend/foo.css",
                    "{$s->sampleContentDirPath}theme/frontend/bar.js"
                ], [
                    //
                ]);
            return;
        }
        if ($expectation === 'createsSiteDirs') {
            $s->mockFs->expects($this->atLeastOnce())
                ->method('isDir')
                ->willReturn(false); // #1,#2 = theme|uploadsDirExists (@copyFiles()),
                                     // #3 = installDirExists (@selfDestruct())
            $s->mockFs->expects($this->atLeastOnce())
                ->method('mkDir')
                ->withConsecutive(
                    ["{$s->siteDirPath}uploads"],
                    ["{$s->siteDirPath}theme"]
                )
                ->willReturn(true);
            return;
        }
        if ($expectation === 'clonesTemplateFilesAndSiteCfgFile') {
            $from = $s->sampleContentDirPath;
            $to = $s->siteDirPath;
            $s->mockFs->expects($this->exactly(6))
                ->method('copy')
                ->withConsecutive(
                    ["{$from}site.json", "{$to}site.json"],
                    ["{$from}README.md", "{$to}README.md"],
                    ["{$from}theme/main.tmpl.php", "{$to}theme/main.tmpl.php"],
                    ["{$from}theme/Another.tmpl.php", "{$to}theme/Another.tmpl.php"],
                    ["{$from}theme/frontend/foo.css", "{$to}theme/foo.css"],
                    ["{$from}theme/frontend/bar.js", "{$to}theme/bar.js"])
                ->willReturn(true);
            return;
        }
        if ($expectation === 'generatesConfigFile') {
            $s->mockFs->expects($this->once())
                ->method('write')
                ->with("{$s->siteDirPath}config.php",
"<?php
if (!defined('RAD_BASE_PATH')) {
    define('RAD_BASE_URL',       '{$s->input->baseUrl}');
    define('RAD_QUERY_VAR',      '{$s->input->mainQueryVar}');
    define('RAD_BASE_PATH',      '{$s->backendPath}');
    define('RAD_SITE_PATH',      '{$s->siteDirPath}');
    define('RAD_DEVMODE',        1 << 1);
    define('RAD_USE_JS_MODULES', 1 << 2);
    define('RAD_FLAGS',          RAD_DEVMODE);
}
return [
    'db.host'        => '{$s->input->dbHost}',
    'db.database'    => '{$s->input->dbDatabase}',
    'db.user'        => '{$s->input->dbUser}',
    'db.pass'        => '{$s->input->dbPass}',
    'db.tablePrefix' => '{$s->input->dbTablePrefix}',
    'db.charset'     => 'utf8',
    'mail.transport' => 'phpsMailFunction',
];
"
)
                ->willReturn(true);
            return;
        }
        if ($expectation === 'deletesInstallerFiles') {
            $s->mockFs->expects($this->atLeast(3))
                ->method('unlink')
                ->withConsecutive(
                    ["{$s->siteDirPath}install.php"],
                    ["{$s->siteDirPath}frontend/install-app.css"],
                    ["{$s->siteDirPath}frontend/rad-install-app.js"]
                )
                ->willReturn(true);
            $s->mockFs->expects($this->atLeast(1))
                ->method('rmDir')
                ->with("{$s->backendPath}installer")
                ->willReturn(true);
            return;
        }
        throw new \Exception('Shouldn\'t happen');
    }
    private function sendInstallRequest($s) {
        $res = $this->createMockResponse('{"ok":"ok","warnings":[]}', 200);
        $app = $this->makeApp([$this,'createInstallerApp'], $this->getAppConfig(),
            (object)['fs' => $s->mockFs]);
        $this->sendRequest(new Request('/', 'POST', $s->input), $res, $app);
    }
    private function verifyCreatedMainSchema($s) {
        self::$db->exec("USE {$s->input->dbDatabase}");
        self::$db->setCurrentDatabaseName($s->input->dbDatabase);
        self::$db->setTablePrefix($s->input->dbTablePrefix);
        $this->assertEquals(1, count(self::$db->fetchAll(
            'SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES' .
            ' WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?',
            [$s->input->dbDatabase, $s->input->dbTablePrefix . 'cmsState']
        )));
    }
    private function verifyInsertedMainSchemaData($s) {
        $row = self::$db->fetchOne('SELECT * FROM ${p}cmsState');
        $this->assertArrayHasKey('name', $row);
        $this->assertEquals($s->input->siteName, $row['name']);
        $this->assertEquals($s->input->siteLang, $row['lang']);
        $filePath = "{$s->backendPath}installer/default-acl-rules.php";
        $this->assertEquals(json_encode((include $filePath)()),
                            $row['aclRules']);
    }
    private function verifyCreatedUserZero($s) {
        $row = self::$db->fetchOne('SELECT * FROM ${p}users');
        $this->assertNotNull($row, 'Pitäisi luoda käyttäjä');
        $expectedLen = strlen('xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx');
        $this->assertEquals($expectedLen, strlen($row['id']));
        $this->assertEquals($s->input->firstUserName, $row['username']);
        $this->assertEquals($s->input->firstUserEmail, $row['email']);
        $this->assertEquals(ACL::ROLE_SUPER_ADMIN, $row['role']);
        $this->assertEquals(null, $row['resetKey']);
        $this->assertEquals(null, $row['resetRequestedAt']);
    }
    private function verifyInsertedSampleContent($s) {
        $this->assertEquals(2, count(self::$db->fetchAll(
            'SELECT `title` FROM ${p}Movies'
        )));
    }


    ////////////////////////////////////////////////////////////////////////////


    public function testInstallerInstallSiteToExistingDatabase() {
        $s = $this->setupInstallerTest1();
        $s->input->dbDatabase = self::TEST_DB_NAME2;
        $s->input->doCreateDb = false;
        self::$db->exec("CREATE DATABASE {$s->input->dbDatabase}");
        $this->addFsExpectation('readsDataFiles', $s);
        $this->addFsExpectation('readsSampleContentFiles', $s);
        $this->addFsExpectation('createsSiteDirs', $s);
        $this->addFsExpectation('clonesTemplateFilesAndSiteCfgFile', $s);
        $this->addFsExpectation('generatesConfigFile', $s);
        $this->addFsExpectation('deletesInstallerFiles', $s);
        $this->sendInstallRequest($s);
        $this->verifyCreatedMainSchema($s);
        $this->verifyInsertedMainSchemaData($s);
        $this->verifyCreatedUserZero($s);
        $this->verifyContentTypeIsInstalled('Movies', true);
        $this->verifyInsertedSampleContent($s);
    }


    ////////////////////////////////////////////////////////////////////////////


    public function testInstallerInstallsWebsiteFromPackage() {
        $s = $this->setupInstallFromPackageTest();
        $this->stubFsToReturnThisAsUploadedFileContents($s->inputPackageFileContents, $s);
        $this->sendInstallFromPackageRequest($s);
        $this->verifyCreatedMainSchema($s);
        $this->verifyInsertedMainSchemaData($s);
        $this->verifyInstalledThemeContentTypes($s);
        $this->verifyInsertedThemeContentData($s);
    }
    private function setupInstallFromPackageTest() {
        $s = $this->setupInstallerTest1();
        $s->input->dbDatabase = self::TEST_DB_NAME3;
        $s->input->unlockKey = 'my-decrypt-key';
        $s->files = (object) ['packageFile' => ['tmp_name' => 'foo.rpkg']];
        $s->mockCrypto = new MockCrypto();
        $s->testSiteContentTypesData = [
            ['SomeType', [(object)['name' => 'val1']]],
            // AnotherTypellä ei sisältöä
        ];
        $s->inputPackageFileContents = $s->mockCrypto->encrypt(
            $this->makeExpectedPackage($s)->getResult(), 'key');
        return $s;
    }
    private function stubFsToReturnThisAsUploadedFileContents($encryptedFileContents, $s) {
        $s->mockFs
            ->method('read')
            ->withConsecutive(
                [$this->stringEndsWith('.rpkg')],
                [$this->stringEndsWith('schema.mariadb.sql')]
            )
            ->willReturnOnConsecutiveCalls(
                $encryptedFileContents,
                file_get_contents(RAD_BASE_PATH . 'installer/schema.mariadb.sql')
            );
    }
    private function sendInstallFromPackageRequest($s) {
        $req = new Request('/from-package', 'POST', $s->input, $s->files);
        $res = $this->createMockResponse('{"ok":"ok"}', 200);
        $app = $this->makeApp([$this,'createInstallerApp'], $this->getAppConfig(),
            (object)['fs' => $s->mockFs, 'crypto' => $s->mockCrypto]);
        $this->sendRequest($req, $res, $app);
    }
    private function verifyInstalledThemeContentTypes($s) {
        [$name] = $s->testSiteContentTypesData[0];
        $this->verifyContentTypeIsInstalled($name, true);
    }
    private function verifyInsertedThemeContentData($s) {
        [$name, $data] = $s->testSiteContentTypesData[0];
        $rows = self::$db->fetchAll('SELECT `name` FROM ${p}' . $name);
        $this->assertEquals(count($data), count($rows));
        $this->assertEquals($data[0]->name, $rows[0]['name']);
    }
    private function makeExpectedPackage($s) {
        return new PlainTextPackageStream([
            Packager::DB_CONFIG_VIRTUAL_FILE_NAME =>
                PackagerControllersTest::makeExpectedPackageFile(Packager::DB_CONFIG_VIRTUAL_FILE_NAME,
                                                                 $s->input),
            Packager::WEBSITE_STATE_VIRTUAL_FILE_NAME =>
                PackagerControllersTest::makeExpectedPackageFile(Packager::WEBSITE_STATE_VIRTUAL_FILE_NAME,
                                                                 $s->input),
            Packager::THEME_CONTENT_TYPES_VIRTUAL_FILE_NAME =>
                PackagerControllersTest::makeExpectedPackageFile(Packager::THEME_CONTENT_TYPES_VIRTUAL_FILE_NAME),
            Packager::THEME_CONTENT_DATA_VIRTUAL_FILE_NAME =>
                json_encode($s->testSiteContentTypesData, JSON_UNESCAPED_UNICODE),
        ]);
    }
    public function createInstallerApp($config, $ctx, $makeInjector) {
        return App::create([Module::class], $config, $ctx, $makeInjector);
    }
}
