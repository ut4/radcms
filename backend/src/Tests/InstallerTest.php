<?php

namespace Rad\Tests;

use RadCms\Installer\InstallerApp;
use RadCms\Tests\Self\DbTestCase;
use RadCms\Request;
use RadCms\Tests\Self\HttpTestUtils;
use RadCms\Installer\InstallerControllers;
use RadCms\Common\FileSystem;

final class InstallerTest extends DbTestCase {
    use HttpTestUtils;
    const TEST_DB_NAME = 'db1';
    public static function tearDownAfterClass($_=null) {
        parent::tearDownAfterClass('drop database if exists ' . self::TEST_DB_NAME);
    }
    public function testInstallerValidatesMissingValues() {
        $input = (object)['sampleContent' => 'test-content', 'dbCharset' => 'utf8'];
        $res = $this->createMockResponse(json_encode([
            'baseUrl !present',
            'radPath !present',
            'dbHost !present',
            'dbUser !present',
            'dbPass !present',
            'dbDatabase !present',
            'dbTablePrefix !present',
        ]), 400);
        $app = InstallerApp::create();
        $app->handleRequest(new Request('/', 'POST', $input), $res);
    }
    public function testInstallerValidatesInvalidValues() {
        $input = (object)[
            'baseUrl' => [],
            'radPath' => 'notValid',
            'sampleContent' => 'foo',
            'dbHost' => [],
            'dbUser' => [],
            'dbPass' => [],
            'dbDatabase' => [],
            'dbTablePrefix' => [],
            'dbCharset' => 'notValid',
        ];
        $res = $this->createMockResponse(json_encode([
            'baseUrl !present',
            'radPath !srcDir',
            'sampleContent !in',
            'dbHost !present',
            'dbUser !present',
            'dbPass !present',
            'dbDatabase !present',
            'dbTablePrefix !present',
            'dbCharset !in',
        ]), 400);
        $app = InstallerApp::create();
        $app->handleRequest(new Request('/', 'POST', $input), $res);
    }
    public function testInstallerFillsDefaultValues() {
        $input = (object)[
            'baseUrl' => 'foo',
            'radPath' => dirname(dirname(__DIR__)),
            'sampleContent' => 'test-content',
            'dbHost' => 'locahost',
            'dbUser' => 'test',
            'dbPass' => 'pass',
            'dbDatabase' => 'name',
            'dbTablePrefix' => 'p_',
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
        $this->assertEquals('utf8', $input->dbCharset);
    }
    public function testInstallerCreatesDbSchemaAndInsertsSampleContent() {
        $s = $this->setupInstallerTest1();
        $this->addFsExpectation('checksRadPathIsValid', $s);
        $this->addFsExpectation('readsDataFiles', $s);
        $this->addFsExpectation('readsSampleContentTemplateFilesDir', $s);
        $this->addFsExpectation('clonesSampleContentTemplateFiles', $s);
        $this->addFsExpectation('generatesConfigFile', $s);
        //
        $res = $this->createMockResponse('{"ok":"ok"}');
        $app = InstallerApp::create($s->targetDir, function ($sitePath) use ($s) {
            return new InstallerControllers($sitePath, $s->mockFs, [get_class(), 'getDb']);
        });
        $app->handleRequest(new Request('/', 'POST', $s->input), $res);
        //
        $this->verifyCreatedNewDatabase($s);
        $this->verifyCreatedSampleContentTypes($s);
        $this->verifyInsertedSampleContent($s);
    }
    private function setupInstallerTest1() {
        include RAD_SITE_PATH . 'config.php';
        return (object) [
            'input' => (object) [
                'baseUrl' => 'foo',
                'radPath' => RAD_BASE_PATH,
                'sampleContent' => 'test-content',
                'dbHost' => $config['db.host'],
                'dbUser' => $config['db.user'],
                'dbPass' => $config['db.pass'],
                'dbDatabase' => self::TEST_DB_NAME,
                'dbTablePrefix' => 'p_',
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
                    [$s->sampleContentBasePath . 'content-types.json'],
                    [$s->sampleContentBasePath . 'sample-data.sql']
                )
                ->willReturnOnConsecutiveCalls(
                    'use ${database};' .
                    ' create table ${p}websiteState (`activeContentTypes` TEXT);' .
                    ' insert into ${p}websiteState values (\'[]\');',
                    //
                    '[{"name":"Movies","friendlyName":"Elokuvat","fields":{"title":"text"}}]',
                    //
                    'insert into ${p}Movies values (1,\'Foo\')'
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
        if ($expectation == 'clonesSampleContentTemplateFiles') {
            $s->mockFs->expects($this->exactly(2))
                ->method('copy')
                ->withConsecutive([
                    $s->sampleContentBasePath . 'main.tmpl.php',
                    $s->targetDir . '/main.tmpl.php'
                ], [
                    $s->sampleContentBasePath . 'Another.tmpl.php',
                    $s->targetDir . '/Another.tmpl.php'
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
define('RAD_BASE_URL', '{$s->input->baseUrl}/');
define('RAD_BASE_PATH', '{$s->input->radPath}');
define('RAD_SITE_PATH', '{$s->targetDir}/');
}
\$config = [
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
            'select `table_name` from information_schema.tables' .
            ' where `table_schema` = ? and `table_name` = ?',
            [$s->input->dbDatabase, $s->input->dbTablePrefix.'websiteState']
        )));
    }
    private function verifyCreatedSampleContentTypes($s) {
        $this->assertEquals(1, count(self::$db->fetchAll(
            'select `table_name` from information_schema.tables' .
            ' where `table_schema` = ? and `table_name` = ?',
            [$s->input->dbDatabase, $s->input->dbTablePrefix . 'Movies']
        )));
    }
    private function verifyInsertedSampleContent($s) {
        $this->assertEquals(1, count(self::$db->fetchAll(
            'select `title` from ${p}Movies'
        )));
        //
        $websiteStates = self::$db->fetchAll(
            'select `activeContentTypes` from ${p}websiteState'
        );
        $this->assertEquals(1, count($websiteStates));
        $this->assertEquals('[["Movies", "Elokuvat", {"title": "text"}]]',
                            $websiteStates[0]['activeContentTypes']);
    }
}
