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
    const TEST_DB_NAME = 'db1';
    public static function tearDownAfterClass($_ = null) {
        parent::tearDownAfterClass('DROP DATABASE IF EXISTS ' . self::TEST_DB_NAME);
    }
    public function testInstallerValidatesMissingValues() {
        $input = (object)['sampleContent' => 'test-content'];
        $res = $this->createMockResponse(json_encode([
            'siteName must be a string',
            'baseUrl must be a non-empty string',
            'radPath must be a non-empty string',
            'mainQueryVar must be a string',
            'useDevMode is required',
            'dbHost must be a non-empty string',
            'dbUser must be a non-empty string',
            'dbPass must be a non-empty string',
            'dbDatabase must be a non-empty string',
            'dbTablePrefix must be a non-empty string',
            'dbCharset must be one of ["utf8"]',
        ]), 400);
        $app = InstallerApp::create();
        $app->handleRequest(new Request('/', 'POST', $input), $res);
    }
    public function testInstallerValidatesInvalidValues() {
        $input = (object)[
            'siteName' => [],
            'baseUrl' => [],
            'radPath' => 'notValid',
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
            'baseUrl must be a non-empty string',
            'radPath is not valid sourcedir',
            'sampleContent must be one of ["minimal","blog","test-content"]',
            'mainQueryVar must be a word',
            'dbHost must be a non-empty string',
            'dbUser must be a non-empty string',
            'dbPass must be a non-empty string',
            'dbDatabase must be a non-empty string',
            'dbTablePrefix must be a non-empty string',
            'dbCharset must be one of ["utf8"]',
        ]), 400);
        $app = InstallerApp::create();
        $app->handleRequest(new Request('/', 'POST', $input), $res);
    }
    public function testInstallerFillsDefaultValues() {
        $input = (object)[
            'siteName' => '',
            'baseUrl' => 'foo',
            'radPath' => dirname(dirname(__DIR__)),
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
        $this->assertEquals('', $input->mainQueryVar);
    }
    public function testInstallerCreatesDbSchemaAndInsertsSampleContent() {
        $s = $this->setupInstallerTest1();
        $this->addFsExpectation('checksRadPathIsValid', $s);
        $this->addFsExpectation('readsDataFiles', $s);
        $this->addFsExpectation('readsSampleContentTemplateFilesDir', $s);
        $this->addFsExpectation('clonesTemplateFilesAndSiteCfgFile', $s);
        $this->addFsExpectation('generatesConfigFile', $s);
        //
        $res = $this->createMockResponse('{"ok":"ok"}', 200);
        $app = InstallerApp::create($s->targetDir, function ($sitePath) use ($s) {
            return new InstallerControllers($sitePath, $s->mockFs, [get_class(), 'getDb']);
        });
        $app->handleRequest(new Request('/', 'POST', $s->input), $res);
        //
        $this->verifyCreatedNewDatabase($s);
        $this->verifyContentTypeIsInstalled('Movies', true, self::$db);
        $this->verifyInsertedSampleContent($s);
    }
    private function setupInstallerTest1() {
        $config = include RAD_SITE_PATH . 'config.php';
        return (object) [
            'input' => (object) [
                'siteName' => '',
                'baseUrl' => 'foo',
                'radPath' => RAD_BASE_PATH,
                'sampleContent' => 'test-content',
                'mainQueryVar' => '',
                'useDevMode' => true,
                'dbHost' => $config['db.host'],
                'dbUser' => $config['db.user'],
                'dbPass' => $config['db.pass'],
                'dbDatabase' => self::TEST_DB_NAME,
                'dbTablePrefix' => 'p_',
                'dbCharset' => 'utf8',
            ],
            'targetDir' => 'c:/foo',
            'sampleContentBasePath' => RAD_BASE_PATH . 'sample-content/test-content/',
            'mockFs' => $this->createMock(FileSystem::class),
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
                    'USE ${database};' .
                    ' CREATE TABLE ${p}websiteState (`installedContentTypes` TEXT' .
                                                     ', `installedContentTypesLastUpdated` TEXT);' .
                    ' INSERT INTO ${p}websiteState values (\'{}\',null);',
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
        if ($expectation == 'clonesTemplateFilesAndSiteCfgFile') {
            $s->mockFs->expects($this->exactly(3))
                ->method('copy')
                ->withConsecutive([
                    $s->sampleContentBasePath . 'site.ini',
                    $s->targetDir . '/site.ini',
                ], [
                    $s->sampleContentBasePath . 'main.tmpl.php',
                    $s->targetDir . '/main.tmpl.php',
                ], [
                    $s->sampleContentBasePath . 'Another.tmpl.php',
                    $s->targetDir . '/Another.tmpl.php',
                ])
                ->willReturn(true);
            return;
        }
        if ($expectation == 'generatesConfigFile') {
            $s->mockFs->expects($this->once())
                ->method('write')
                ->with($s->targetDir . '/config.php',
"<?php
if (!defined('RAD_BASE_PATH')) {
define('RAD_BASE_URL',  '{$s->input->baseUrl}/');
define('RAD_QUERY_VAR', '{$s->input->mainQueryVar}');
define('RAD_BASE_PATH', '{$s->input->radPath}');
define('RAD_SITE_PATH', '{$s->targetDir}/');
define('RAD_DEVMODE',   1 << 1);
define('RAD_FLAGS',     RAD_DEVMODE);
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
    private function verifyCreatedNewDatabase($s) {
        $this->assertEquals(1, count(self::$db->fetchAll(
            'SELECT `table_name` FROM information_schema.tables' .
            ' WHERE `table_schema` = ? AND `table_name` = ?',
            [$s->input->dbDatabase, $s->input->dbTablePrefix . 'websiteState']
        )));
        self::$db->database = $s->input->dbDatabase;
    }
    private function verifyInsertedSampleContent($s) {
        $this->assertEquals(2, count(self::$db->fetchAll(
            'SELECT `title` FROM ${p}Movies'
        )));
    }
}
