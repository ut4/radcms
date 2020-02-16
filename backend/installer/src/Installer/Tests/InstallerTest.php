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

final class InstallerTest extends DbTestCase {
    use HttpTestUtils;
    use ContentTestUtils;
    const TEST_DB_NAME1 = 'db1';
    const TEST_DB_NAME2 = 'db2';
    public function setUp() {
        parent::setUp();
        if (!defined('INDEX_DIR_PATH')) {
            define('INDEX_DIR_PATH', RAD_SITE_PATH);
        }
    }
    public static function tearDownAfterClass() {
        parent::tearDownAfterClass();
        self::$db->exec('DROP DATABASE IF EXISTS ' . self::TEST_DB_NAME1 .
                        ';DROP DATABASE IF EXISTS ' . self::TEST_DB_NAME2);
    }
    public function testInstallerValidatesMissingValues() {
        $input = (object)['sampleContent' => 'test-content'];
        $res = $this->createMockResponse(json_encode([
            'siteName must be a string',
            'siteLang must be one of ["en_US","fi_FI"]',
            'mainQueryVar must be a string',
            'useDevMode is required',
            'dbHost must be a non-empty string',
            'dbUser must be a non-empty string',
            'dbPass must be a non-empty string',
            'dbDatabase must be a non-empty string',
            'dbTablePrefix must be a non-empty string',
            'dbCharset must be one of ["utf8"]',
            'firstUserName must be a non-empty string',
            'firstUserPass must be a non-empty string',
            'baseUrl must be a non-empty string',
        ]), 400);
        $app = $this->makeApp([$this,'createInstallerApp'], $this->getAppConfig());
        $this->sendRequest(new Request('/', 'POST', $input), $res, $app);
    }
    public function testInstallerValidatesInvalidValues() {
        $input = (object)[
            'siteName' => [],
            'siteLang' => [],
            'sampleContent' => 'foo',
            'mainQueryVar' => '%&"¤',
            'useDevMode' => true,
            'dbHost' => [],
            'dbUser' => [],
            'dbPass' => [],
            'dbDatabase' => [],
            'dbTablePrefix' => [],
            'dbCharset' => 'notValid',
            'firstUserName' => [],
            'firstUserPass' => [],
            'baseUrl' => [],
        ];
        $res = $this->createMockResponse(json_encode([
            'siteName must be a string',
            'siteLang must be one of ["en_US","fi_FI"]',
            'sampleContent must be one of ["minimal","blog","test-content"]',
            'mainQueryVar must be a word',
            'dbHost must be a non-empty string',
            'dbUser must be a non-empty string',
            'dbPass must be a non-empty string',
            'dbDatabase must be a non-empty string',
            'dbTablePrefix must be a non-empty string',
            'dbCharset must be one of ["utf8"]',
            'firstUserName must be a non-empty string',
            'firstUserPass must be a non-empty string',
            'baseUrl must be a non-empty string',
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
            'useDevMode' => true,
            'dbHost' => 'locahost',
            'dbUser' => 'test',
            'dbPass' => 'pass',
            'dbDatabase' => 'name',
            'dbTablePrefix' => 'p_',
            'dbCharset' => 'utf8',
            'firstUserName' => 'user',
            'firstUserPass' => 'pass',
            'baseUrl' => [],
        ];
        $res = $this->createMockResponse($this->anything(), 400);
        $app = $this->makeApp([$this,'createInstallerApp'], $this->getAppConfig());
        $this->sendRequest(new Request('/', 'POST', $input), $res, $app);
        $this->assertEquals('My Site', $input->siteName);
        $this->assertEquals('', $input->mainQueryVar);
    }
    public function testInstallerCreatesDbSchemaAndInsertsSampleContent() {
        $s = $this->setupInstallerTest1();
        $this->addFsExpectation('checksTemplatesExist', $s);
        $this->addFsExpectation('readsDataFiles', $s);
        $this->addFsExpectation('readsSampleContentFiles', $s);
        $this->addFsExpectation('createsSiteDirs', $s);
        $this->addFsExpectation('clonesTemplateFilesAndSiteCfgFile', $s);
        $this->addFsExpectation('generatesConfigFile', $s);
        $this->addFsExpectation('deletesInstallerFiles', $s);
        $this->sendInstallRequest($s);
        $this->verifyCreatedNewDatabaseAndMainSchema($s);
        $this->verifyInsertedMainSchemaData($s);
        $this->verifyCreatedUserZero($s);
        $this->verifyContentTypeIsInstalled('Movies', true, self::$db);
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
        if ($expectation === 'checksTemplatesExist') {
            $s->mockFs->expects($this->atLeastOnce())
                ->method('isFile')
                ->willReturn(true);
            return;
        }
        if ($expectation === 'readsDataFiles') {
            $s->mockFs->expects($this->exactly(3))
                ->method('read')
                ->withConsecutive(
                    ["{$s->backendPath}installer/schema.mariadb.sql"],
                    ["{$s->sampleContentDirPath}sample-data.json"],
                    ["{$s->sampleContentDirPath}site.json"]
                )
                ->willReturnOnConsecutiveCalls(
                    file_get_contents("{$s->backendPath}installer/schema.mariadb.sql"),
                    //
                    '[' .
                        '["Movies", [{"title": "Foo"}, {"title": "Bar"}]]' .
                    ']',
                    //
                    '{' .
                        '"contentTypes": [["Movies", "Elokuvat", {"title": "text"}]]' .
                        ',"urlMatchers": [["/url", "file.tmpl.php"]]' .
                    '}'
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
    private function verifyCreatedNewDatabaseAndMainSchema($s) {
        self::$db->exec("USE {$s->input->dbDatabase}");
        self::$db->setCurrentDatabaseName($s->input->dbDatabase);
        self::$db->setTablePrefix($s->input->dbTablePrefix);
        $this->assertEquals(1, count(self::$db->fetchAll(
            'SELECT `table_name` FROM information_schema.tables' .
            ' WHERE `table_schema` = ? AND `table_name` = ?',
            [$s->input->dbDatabase, $s->input->dbTablePrefix . 'websiteState']
        )));
    }
    private function verifyInsertedMainSchemaData($s) {
        $row = self::$db->fetchOne('SELECT * FROM ${p}websiteState');
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


    public function testInstallerInstallsWebsiteFromPackage() {
        $s = $this->setupInstallFromPackageTest();
        $this->stubFsToReturnThisAsUploadedFileContents($s->inputPackageFileContents, $s);
        $this->sendInstallFromPackageRequest($s);
        $this->verifyCreatedNewDatabaseAndMainSchema($s);
        $this->verifyInsertedMainSchemaData($s);
        $this->verifyInstalledThemeContentTypes($s);
        $this->verifyInsertedThemeContentData($s);
    }
    private function setupInstallFromPackageTest() {
        $s = $this->setupInstallerTest1();
        $s->input->dbDatabase = self::TEST_DB_NAME2;
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
        $this->verifyContentTypeIsInstalled($name, true, self::$db);
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
            Packager::WEBSITE_CONFIG_VIRTUAL_FILE_NAME =>
                PackagerControllersTest::makeExpectedPackageFile(Packager::WEBSITE_CONFIG_VIRTUAL_FILE_NAME),
            Packager::THEME_CONTENT_DATA_VIRTUAL_FILE_NAME =>
                json_encode($s->testSiteContentTypesData, JSON_UNESCAPED_UNICODE),
        ]);
    }
    public function createInstallerApp($config, $ctx, $makeInjector) {
        return App::create([Module::class], $config, $ctx, $makeInjector);
    }
}
