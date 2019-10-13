<?php

namespace Rad\Tests;

use RadCms\Installer\InstallerApp;
use PHPUnit\Framework\TestCase;
use RadCms\Request;
use RadCms\Tests\Common\HttpTestUtils;
use RadCms\Common\Db;
use RadCms\Installer\InstallerControllers;
use RadCms\Common\FileSystem;

final class InstallerTest extends TestCase {
    use HttpTestUtils;
    const TEST_DB_NAME = 'db1';
    private static $db = null;
    public static function getDb(array $config) {
        if (!self::$db) self::$db = new Db($config);
        self::$db->beginTransaction();
        return self::$db;
    }
    public static function tearDownAfterClass() {
        if (self::$db) {
            self::$db->rollback();
            self::$db->exec('drop database if exists ' . self::TEST_DB_NAME);
        }
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
        include RAD_SITE_PATH . 'config.php';
        $input = (object)[
            'baseUrl' => 'foo',
            'radPath' => RAD_BASE_PATH,
            'sampleContent' => 'test-content',
            'dbHost' => $config['db.host'],
            'dbUser' => $config['db.user'],
            'dbPass' => $config['db.pass'],
            'dbDatabase' => self::TEST_DB_NAME,
            'dbTablePrefix' => 'p_',
        ];
        //
        $targetDir = 'c:/foo';
        $sampleContentBasePath = $input->radPath . 'sample-content/test-content/';
        $mockFs = $this->createMock(FileSystem::class);
        $mockFs->expects($this->once())
            ->method('isFile') // InstallControllers::validateInstallInput
            ->willReturn(true);
        $mockFs->expects($this->exactly(3))
            ->method('read') // Installer::doInstall
            ->withConsecutive(
                [$input->radPath . 'schema.mariadb.sql'],
                [$sampleContentBasePath . 'content-types.json'],
                [$sampleContentBasePath . 'sample-data.sql']
            )
            ->willReturnOnConsecutiveCalls(
                'use ${database}; create table ${p}websiteConfigs (id INT);',
                '[{"name":"Movies","friendlyName":"Elokuvat","fields":{"title":"text"}}]',
                'insert into ${p}Movies values (1,\'Foo\')'
            );
        $mockFs->expects($this->once())
            ->method('readDir') // Installer::cloneSampleContentTemplateFiles
            ->with($sampleContentBasePath, '*.tmpl.php')
            ->willReturn([
                $sampleContentBasePath . 'main.tmpl.php',
                $sampleContentBasePath . 'Another.tmpl.php'
        ]);
        $mockFs->expects($this->exactly(2))
            ->method('copy') // Installer::cloneSampleContentTemplateFiles
            ->withConsecutive([
                $sampleContentBasePath . 'main.tmpl.php',
                $targetDir . '/main.tmpl.php'
            ], [
                $sampleContentBasePath . 'Another.tmpl.php',
                $targetDir . '/Another.tmpl.php'
            ])
            ->willReturn(true);

        $mockFs->expects($this->once())
            ->method('write') // Installer::generateConfigFile
            ->with($targetDir . '/config.php',
"<?php
if (!defined('RAD_BASE_PATH')) {
define('RAD_BASE_URL', '{$input->baseUrl}/');
define('RAD_BASE_PATH', '{$input->radPath}');
define('RAD_SITE_PATH', '{$targetDir}/');
}
\$config = [
    'db.host'        => '{$input->dbHost}',
    'db.database'    => '{$input->dbDatabase}',
    'db.user'        => '{$input->dbUser}',
    'db.pass'        => '{$input->dbPass}',
    'db.tablePrefix' => '{$input->dbTablePrefix}',
    'db.charset'     => 'utf8',
];
"
)
            ->willReturn(true);
        $res = $this->createMockResponse('{"ok":"ok"}');
        //
        $app = InstallerApp::create($targetDir, function ($sitePath) use ($mockFs) {
            return new InstallerControllers($sitePath, $mockFs, [get_class(), 'getDb']);
        });
        $app->handleRequest(new Request('/', 'POST', $input), $res);
        //
        $this->assertEquals(1, count(self::$db->fetchAll(
            'select `table_name` from information_schema.tables' .
            ' where `table_schema` = ? and `table_name` = ?',
            [$input->dbDatabase, $input->dbTablePrefix.'websiteConfigs']
        )));
        $this->assertEquals(1, count(self::$db->fetchAll(
            'select `table_name` from information_schema.tables' .
            ' where `table_schema` = ? and `table_name` = ?',
            [$input->dbDatabase, $input->dbTablePrefix . 'Movies']
        )));
        $this->assertEquals(1, count(self::$db->fetchAll(
            'select `title` from ${p}' . 'Movies'
        )));
    }
}
