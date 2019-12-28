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

final class InstallerTest extends DbTestCase {
    use HttpTestUtils;
    use ContentTestUtils;
    const TEST_DB_NAME1 = 'db1';
    const TEST_DB_NAME2 = 'db2';
    public function setUp() {
        if (!defined('INDEX_DIR_PATH')) {
            define('INDEX_DIR_PATH', RAD_SITE_PATH);
        }
    }
    public static function tearDownAfterClass() {
        parent::tearDownAfterClass();
        self::getDb()->exec('DROP DATABASE IF EXISTS ' . self::TEST_DB_NAME1 .
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
        $this->sendRequest(new Request('/', 'POST', $input),
                           $res,
                           [$this,'createInstallerApp']);
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
        $this->sendRequest(new Request('/', 'POST', $input),
                           $res,
                           [$this, 'createInstallerApp']);
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
        $this->sendRequest(new Request('/', 'POST', $input),
                           $res,
                           [$this, 'createInstallerApp']);
        $this->assertEquals('My Site', $input->siteName);
        $this->assertEquals('', $input->mainQueryVar);
    }
    public function testInstallerCreatesDbSchemaAndInsertsSampleContent() {
        $s = $this->setupInstallerTest1();
        $this->addFsExpectation('checksTemplatesExist', $s);
        $this->addFsExpectation('readsDataFiles', $s);
        $this->addFsExpectation('readsSampleContentTemplateFilesDir', $s);
        $this->addFsExpectation('createsSiteTemplatesDir', $s);
        $this->addFsExpectation('clonesTemplateFilesAndSiteCfgFile', $s);
        $this->addFsExpectation('generatesConfigFile', $s);
        $this->addFsExpectation('deletesInstallerFiles', $s);
        $this->sendInstallRequest($s);
        $this->verifyCreatedNewDatabaseAndMainSchema($s);
        $this->verifyInsertedMainSchemaData($s);
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
        if ($expectation === 'readsSampleContentTemplateFilesDir') {
            $s->mockFs->expects($this->exactly(3))
                ->method('readDir')
                ->withConsecutive(
                    [$s->sampleContentDirPath, '*.tmpl.php'],
                    ["{$s->sampleContentDirPath}frontend/", '*.{css,js}', $this->anything()],
                    ["{$s->backendPath}installer"] // @selfDestruct
                )
                ->willReturnOnConsecutiveCalls([
                    "{$s->sampleContentDirPath}main.tmpl.php",
                    "{$s->sampleContentDirPath}Another.tmpl.php"
                ], [
                    "{$s->sampleContentDirPath}frontend/foo.css",
                    "{$s->sampleContentDirPath}frontend/bar.js"
                ], [
                    //
                ]);
            return;
        }
        if ($expectation === 'createsSiteTemplatesDir') {
            $s->mockFs->expects($this->atLeastOnce())
                ->method('isDir')
                ->willReturn(false); // #1 = uploadsDirExists (@cloneTemplatesAndCfgFile()),
                                     // #2 = installDirExists (@selfDestruct())
            $s->mockFs->expects($this->once())
                ->method('mkDir')
                ->with($s->siteDirPath . 'uploads')
                ->willReturn(true);
            return;
        }
        if ($expectation === 'clonesTemplateFilesAndSiteCfgFile') {
            $s->mockFs->expects($this->exactly(6))
                ->method('copy')
                ->withConsecutive([
                    "{$s->sampleContentDirPath}site.json",
                    "{$s->siteDirPath}site.json",
                ], [
                    "{$s->sampleContentDirPath}README.md",
                    "{$s->siteDirPath}README.md",
                ], [
                    "{$s->sampleContentDirPath}main.tmpl.php",
                    "{$s->siteDirPath}main.tmpl.php",
                ], [
                    "{$s->sampleContentDirPath}Another.tmpl.php",
                    "{$s->siteDirPath}Another.tmpl.php",
                ], [
                    "{$s->sampleContentDirPath}frontend/foo.css",
                    "{$s->siteDirPath}foo.css",
                ], [
                    "{$s->sampleContentDirPath}frontend/bar.js",
                    "{$s->siteDirPath}bar.js",
                ])
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
    define('RAD_USE_BUNDLED_JS', 2 << 1);
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
            $s->mockFs->expects($this->atLeast(1))
                ->method('unlink')
                ->with("{$s->siteDirPath}install.php")
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
        $this->sendRequest(new Request('/', 'POST', $s->input),
                           $res,
                           [$this, 'createInstallerApp'],
                           (object)['fs' => $s->mockFs]);
    }
    private function verifyCreatedNewDatabaseAndMainSchema($s) {
        $this->assertEquals(1, count(self::$db->fetchAll(
            'SELECT `table_name` FROM information_schema.tables' .
            ' WHERE `table_schema` = ? AND `table_name` = ?',
            [$s->input->dbDatabase, $s->input->dbTablePrefix . 'websiteState']
        )));
        self::$db->setDatabase($s->input->dbDatabase);
    }
    private function verifyInsertedMainSchemaData($s) {
        $row = self::$db->fetchOne('SELECT * FROM ${p}websiteState');
        $this->assertArrayHasKey('name', $row);
        $this->assertEquals($s->input->siteName, $row['name']);
        $this->assertEquals($s->input->siteLang, $row['lang']);
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
        $this->sendRequest($req,
                           $res,
                           [$this, 'createInstallerApp'],
                           (object)['fs' => $s->mockFs, 'crypto' => $s->mockCrypto]);
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
    public function createInstallerApp($config, $ctx) {
        return App::create([Module::class], $config, $ctx);
    }
}