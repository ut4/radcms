<?php

namespace RadCms\Tests;

use RadCms\Installer\InstallerApp;
use RadCms\Tests\Self\DbTestCase;
use RadCms\Framework\Request;
use RadCms\Tests\Self\HttpTestUtils;
use RadCms\Installer\InstallerControllers;
use RadCms\Framework\FileSystem;
use RadCms\Tests\Self\ContentTypeDbTestUtils;

final class InstallerTest extends DbTestCase {
    use HttpTestUtils;
    use ContentTypeDbTestUtils;
    const TEST_DB_NAME1 = 'db1';
    const TEST_DB_NAME2 = 'db2';
    public static function tearDownAfterClass($_ = null) {
        parent::tearDownAfterClass('DROP DATABASE IF EXISTS ' . self::TEST_DB_NAME1.
                                   ';DROP DATABASE IF EXISTS ' . self::TEST_DB_NAME2);
    }
    public function testInstallerValidatesMissingValues() {
        $input = (object)['sampleContent' => 'test-content'];
        $res = $this->createMockResponse(json_encode([
            'siteName must be a string',
            'siteLang must be one of ["en_US","fi_FI"]',
            'baseUrl must be a non-empty string',
            'radPath must be a non-empty string',
            'sitePath must be a non-empty string',
            'mainQueryVar must be a string',
            'useDevMode is required',
            'dbHost must be a non-empty string',
            'dbUser must be a non-empty string',
            'dbPass must be a non-empty string',
            'dbDatabase must be a non-empty string',
            'dbTablePrefix must be a non-empty string',
            'dbCharset must be one of ["utf8"]',
        ]), 400);
        $app = InstallerApp::create('');
        $app->handleRequest(new Request('/', 'POST', $input), $res);
    }
    public function testInstallerValidatesInvalidValues() {
        $input = (object)[
            'siteName' => [],
            'siteLang' => [],
            'baseUrl' => [],
            'radPath' => 'notValid',
            'sitePath' => [],
            'sampleContent' => 'foo',
            'mainQueryVar' => '%&"¤',
            'useDevMode' => true,
            'dbHost' => [],
            'dbUser' => [],
            'dbPass' => [],
            'dbDatabase' => [],
            'dbTablePrefix' => [],
            'dbCharset' => 'notValid',
        ];
        $res = $this->createMockResponse(json_encode([
            'siteName must be a string',
            'siteLang must be one of ["en_US","fi_FI"]',
            'baseUrl must be a non-empty string',
            'radPath is not valid sourcedir',
            'sitePath must be a non-empty string',
            'sampleContent must be one of ["minimal","blog","test-content"]',
            'mainQueryVar must be a word',
            'dbHost must be a non-empty string',
            'dbUser must be a non-empty string',
            'dbPass must be a non-empty string',
            'dbDatabase must be a non-empty string',
            'dbTablePrefix must be a non-empty string',
            'dbCharset must be one of ["utf8"]',
        ]), 400);
        $app = InstallerApp::create('');
        $app->handleRequest(new Request('/', 'POST', $input), $res);
    }
    public function testInstallerFillsDefaultValues() {
        $input = (object)[
            'siteName' => '',
            'siteLang' => 'fi_FI',
            'baseUrl' => 'foo',
            'radPath' => dirname(dirname(__DIR__)),
            'sitePath' => 'c:/my-site',
            'sampleContent' => 'test-content',
            'mainQueryVar' => '',
            'useDevMode' => true,
            'dbHost' => 'locahost',
            'dbUser' => 'test',
            'dbPass' => 'pass',
            'dbDatabase' => 'name',
            'dbTablePrefix' => 'p_',
            'dbCharset' => 'utf8',
        ];
        $res = $this->createMockResponse($this->anything(), 500);
        $app = InstallerApp::create('', function () {
            return new InstallerControllers('', null, function () {
                throw new \PDOException('...');
            });
        });
        $app->handleRequest(new Request('/', 'POST', $input), $res);
        $this->assertEquals('My Site', $input->siteName);
        $this->assertEquals('foo/', $input->baseUrl);
        $this->assertEquals('c:/my-site/', $input->sitePath);
        $this->assertEquals('', $input->mainQueryVar);
    }
    public function testInstallerCreatesDbSchemaAndInsertsSampleContent() {
        $s = $this->setupInstallerTest1();
        $s->mockFs = $this->createMock(FileSystem::class);
        $this->addFsExpectation('checksRadPathIsValid', $s);
        $this->addFsExpectation('readsDataFiles', $s);
        $this->addFsExpectation('readsSampleContentTemplateFilesDir', $s);
        $this->addFsExpectation('createsSiteTemplatesDir', $s);
        $this->addFsExpectation('clonesTemplateFilesAndSiteCfgFile', $s);
        $this->addFsExpectation('generatesConfigFile', $s);
        $this->sendInstallRequest($s);
        $this->verifyCreatedNewDatabaseAndMainSchema($s);
        $this->verifyInsertedMainSchemaData($s);
        $this->verifyContentTypeIsInstalled('Movies', true, self::$db);
        $this->verifyInsertedSampleContent($s);
    }
    private function setupInstallerTest1() {
        $config = include __DIR__ . '/test-site/config.php';
        return (object) [
            'input' => (object) [
                'siteName' => '',
                'siteLang' => 'en_US',
                'baseUrl' => 'foo',
                'radPath' => RAD_BASE_PATH,
                'sitePath' => 'c:/my-site/',
                'sampleContent' => 'test-content',
                'mainQueryVar' => '',
                'useDevMode' => true,
                'dbHost' => $config['db.host'],
                'dbUser' => $config['db.user'],
                'dbPass' => $config['db.pass'],
                'dbDatabase' => self::TEST_DB_NAME1,
                'dbTablePrefix' => 'p_',
                'dbCharset' => 'utf8',
            ],
            'indexFilePath' => 'c:/foo',
            'sampleContentBasePath' => RAD_BASE_PATH . 'sample-content/test-content/',
            'mockFs' => null
        ];
    }
    private function addFsExpectation($expectation, $s) {
        if ($expectation == 'checksRadPathIsValid') {
            $s->mockFs->expects($this->once())
                ->method('isFile')
                ->willReturn(true);
            return;
        }
        if ($expectation == 'readsDataFiles') {
            $s->mockFs->expects($this->exactly(3))
                ->method('read')
                ->withConsecutive(
                    [$s->input->radPath . 'schema.mariadb.sql'],
                    [$s->sampleContentBasePath . 'sample-data.json'],
                    [$s->sampleContentBasePath . 'site.ini']
                )
                ->willReturnOnConsecutiveCalls(
                    file_get_contents(RAD_BASE_PATH . 'schema.mariadb.sql'),
                    //
                    '[' .
                        '["Movies", {"title": "Foo"}],' .
                        '["Movies", {"title": "Bar"}]' .
                    ']',
                    //
                    '[ContentType:Movies]' . PHP_EOL .
                    'friendlyName=Elokuvat' . PHP_EOL .
                    'fields[title]=text'
                );
            return;
        }
        if ($expectation == 'readsSampleContentTemplateFilesDir') {
            $s->mockFs->expects($this->once())
                ->method('readDir')
                ->with($s->sampleContentBasePath, '*.tmpl.php')
                ->willReturn([
                    $s->sampleContentBasePath . 'main.tmpl.php',
                    $s->sampleContentBasePath . 'Another.tmpl.php'
                ]);
            return;
        }
        if ($expectation == 'createsSiteTemplatesDir') {
            $s->mockFs->expects($this->once())
                ->method('isDir')
                ->willReturn(false);
            $s->mockFs->expects($this->once())
                ->method('mkDir')
                ->with($s->input->sitePath)
                ->willReturn(true);
            return;
        }
        if ($expectation == 'clonesTemplateFilesAndSiteCfgFile') {
            $s->mockFs->expects($this->exactly(3))
                ->method('copy')
                ->withConsecutive([
                    $s->sampleContentBasePath . 'site.ini',
                    $s->input->sitePath . 'site.ini',
                ], [
                    $s->sampleContentBasePath . 'main.tmpl.php',
                    $s->input->sitePath . 'main.tmpl.php',
                ], [
                    $s->sampleContentBasePath . 'Another.tmpl.php',
                    $s->input->sitePath . 'Another.tmpl.php',
                ])
                ->willReturn(true);
            return;
        }
        if ($expectation == 'generatesConfigFile') {
            $s->mockFs->expects($this->once())
                ->method('write')
                ->with($s->indexFilePath . '/config.php',
"<?php
if (!defined('RAD_BASE_PATH')) {
define('RAD_BASE_URL',   '{$s->input->baseUrl}/');
define('RAD_QUERY_VAR',  '{$s->input->mainQueryVar}');
define('RAD_BASE_PATH',  '{$s->input->radPath}');
define('RAD_INDEX_PATH', '{$s->indexFilePath}/');
define('RAD_SITE_PATH',  '{$s->input->sitePath}');
define('RAD_DEVMODE',    1 << 1);
define('RAD_FLAGS',      RAD_DEVMODE);
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
        throw new \Exception('Shouldn\'t happen');
    }
    private function sendInstallRequest($s) {
        $res = $this->createMockResponse('{"ok":"ok"}', 200);
        $app = InstallerApp::create($s->indexFilePath, function ($indexFilePath) use ($s) {
            return new InstallerControllers($indexFilePath, $s->mockFs, [get_class(), 'getDb']);
        });
        $app->handleRequest(new Request('/', 'POST', $s->input), $res);
    }
    private function verifyCreatedNewDatabaseAndMainSchema($s) {
        $this->assertEquals(1, count(self::$db->fetchAll(
            'SELECT `table_name` FROM information_schema.tables' .
            ' WHERE `table_schema` = ? AND `table_name` = ?',
            [$s->input->dbDatabase, $s->input->dbTablePrefix . 'websiteState']
        )));
        self::$db->database = $s->input->dbDatabase;
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
        $this->sendInstallFromPackageRequest($s);
        $this->verifyCreatedNewDatabaseAndMainSchema($s);
        $this->verifyInsertedMainSchemaData($s);
    }
    private function setupInstallFromPackageTest() {
        $s = $this->setupInstallerTest1();
        $s->input->dbDatabase = self::TEST_DB_NAME2;
        $s->files = (object) ['packageFile' => ['tmp_name' => 'foo.zip']];
        $s->testPackage = PackagerControllersTest::makeExpectedPackage($s->input);
        $s->mockFs = $this->getMockBuilder(FileSystem::class)
                          ->setMethods(['mkDir', 'copy', 'write'])
                          ->getMock();
        return $s;
    }
    private function sendInstallFromPackageRequest($s) {
        $req = new Request('/from-package', 'POST', $s->input, $s->files);
        $res = $this->createMockResponse('{"ok":"ok"}', 200);
        $app = InstallerApp::create($s->indexFilePath, function ($indexFilePath) use ($s) {
            return new InstallerControllers($indexFilePath,
                                            $s->mockFs,
                                            [get_class(), 'getDb'],
                                            function () use ($s) {
                                                return $s->testPackage;
                                            });
        });
        $app->handleRequest($req, $res);
    }
    public static function clearInstalledContentTypesFromDb() {
        self::getDb()->exec('UPDATE ${p}websiteState SET' .
                            ' `installedContentTypes` = \'{}\'' .
                            ', `installedContentTypesLastUpdated` = NULL');
    }
}
