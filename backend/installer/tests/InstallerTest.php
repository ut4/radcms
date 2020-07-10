<?php

namespace RadCms\Installer\Tests;

use Pike\{FileSystem, Request};
use Pike\TestUtils\HttpTestUtils;
use RadCms\AppContext;
use RadCms\Auth\ACL;
use RadCms\Installer\Installer;
use RadCms\Tests\_Internal\ContentTestUtils;

final class InstallerTest extends BaseInstallerTest {
    use HttpTestUtils;
    use ContentTestUtils;
    const TEST_DB_NAME1 = 'radInstallerTestDb1';
    const TEST_DB_NAME2 = 'radInstallerTestDb2';
    const TEST_DB_NAME3 = 'radInstallerTestDb3';
    public static function tearDownAfterClass(): void {
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
        $app = $this->makeApp([$this,'createInstallerApp'],
                              $this->getAppConfig(),
                              '\RadCms\AppContext');
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
            'The length of dbTablePrefix must be at least 1',
            'The value of dbCharset was not in the list',
            'The length of firstUserName must be at least 1',
            'The length of firstUserEmail must be at least 3',
            'firstUserPass must be string',
            'The length of baseUrl must be at least 1',
        ]), 400);
        $app = $this->makeApp([$this,'createInstallerApp'],
                              $this->getAppConfig(),
                              '\RadCms\AppContext');
        $this->sendRequest(new Request('/', 'POST', $input), $res, $app);
    }
    public function testInstallerFillsDefaultValues() {
        $input = (object)[
            'siteName' => '',
            'siteLang' => 'fi',
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
            '\RadCms\AppContext', function ($injector) {
                $injector->delegate(Installer::class, function() {
                    $m = $this->createMock(Installer::class);
                    $m->method('doInstall')->willReturn(RAD_WORKSPACE_PATH);
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
        $this->verifyCreatedMainSchema($s->input->dbDatabase,
                                       $s->input->dbTablePrefix);
        $this->verifyInsertedMainSchemaData($s->input->siteName,
                                            $s->input->siteLang,
                                            "{$s->backendPath}installer/default-acl-rules.php");
        $this->verifyCreatedUserZero($s->input->firstUserName,
                                     $s->input->firstUserEmail,
                                     ACL::ROLE_SUPER_ADMIN);
        $this->verifyContentTypeIsInstalled('Movies', true);
        $this->verifyInsertedSampleContent($s);
    }
    private function setupInstallerTest1() {
        $config = require TEST_SITE_PUBLIC_PATH . 'config.php';
        return (object) [
            'input' => (object) [
                'siteName' => '',
                'siteLang' => 'en',
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
            'backendPath' => RAD_BACKEND_PATH,
            'workspacePath' => RAD_WORKSPACE_PATH,
            'publicPath' => RAD_PUBLIC_PATH,
            'sampleContentDirPath' => RAD_BACKEND_PATH . 'installer/sample-content/test-content/',
            'mockFs' => $this->createMock(FileSystem::class)
        ];
    }
    private function addFsExpectation($expectation, $s) {
        if ($expectation === 'readsDataFiles') {
            $s->mockFs->expects($this->exactly(3))
                ->method('read')
                ->withConsecutive(
                    ["{$s->backendPath}assets/schema.mariadb.sql"],
                    ["{$s->sampleContentDirPath}content-types.json"],
                    ["{$s->sampleContentDirPath}sample-data.json"]
                )
                ->willReturnOnConsecutiveCalls(
                    file_get_contents("{$s->backendPath}assets/schema.mariadb.sql"),
                    //
                    '[' .
                        '{"name":"Movies","friendlyName":"Elokuvat","isInternal":false' .
                        ',"fields":[{"name":"title","dataType":"text"}]}' .
                    ']',
                    //
                    '[' .
                        '["Movies", [{"title": "Foo"}, {"title": "Bar"}]]' .
                    ']'
                );
            return;
        }
        if ($expectation === 'readsSampleContentFiles') {
            $s->mockFs->expects($this->exactly(2))
                ->method('readDirRecursive')
                ->withConsecutive(
                    ["{$s->sampleContentDirPath}site/", '/.*/'],
                    ["{$s->sampleContentDirPath}frontend/", '/.*/']
                )
                ->willReturnOnConsecutiveCalls([
                    "{$s->sampleContentDirPath}site/templates/dir/main.tmpl.php",
                    "{$s->sampleContentDirPath}site/templates/Another.tmpl.php",
                    "{$s->sampleContentDirPath}site/README.md",
                    "{$s->sampleContentDirPath}site/Site.php",
                    "{$s->sampleContentDirPath}site/Theme.php",
                ], [
                    "{$s->sampleContentDirPath}frontend/foo.css",
                    "{$s->sampleContentDirPath}frontend/dir/bar.js"
                ]);
            return;
        }
        if ($expectation === 'createsSiteDirs') {
            $s->mockFs->expects($this->atLeastOnce())
                ->method('isDir')
                ->willReturn(false); // #1,#2 = site|uploadsDirExists (@copyFiles()),
                                     // #3 = installDirExists (@selfDestruct())
            $s->mockFs->expects($this->atLeastOnce())
                ->method('mkDir')
                ->withConsecutive(
                    ["{$s->workspacePath}site/templates"],
                    ["{$s->publicPath}uploads"]
                )
                ->willReturn(true);
            return;
        }
        if ($expectation === 'clonesTemplateFilesAndSiteCfgFile') {
            $siteFrom = "{$s->sampleContentDirPath}site/";
            $frontendFrom = "{$s->sampleContentDirPath}frontend/";
            $siteTo = "{$s->workspacePath}site/";
            $frontendTo = "{$s->publicPath}frontend/";
            $s->mockFs->expects($this->atLeastOnce())
                ->method('copy')
                ->withConsecutive(
                    ["{$siteFrom}templates/dir/main.tmpl.php", "{$siteTo}templates/dir/main.tmpl.php"],
                    ["{$siteFrom}templates/Another.tmpl.php", "{$siteTo}templates/Another.tmpl.php"],
                    ["{$siteFrom}README.md", "{$siteTo}README.md"],
                    ["{$siteFrom}Site.php", "{$siteTo}Site.php"],
                    ["{$siteFrom}Theme.php", "{$siteTo}Theme.php"],
                    ["{$frontendFrom}foo.css", "{$frontendTo}foo.css"],
                    ["{$frontendFrom}dir/bar.js", "{$frontendTo}dir/bar.js"])
                ->willReturn(true);
            return;
        }
        if ($expectation === 'generatesConfigFile') {
            $s->mockFs->expects($this->once())
                ->method('write')
                ->with("{$s->publicPath}config.php",
"<?php
if (!defined('RAD_BASE_URL')) {
    define('RAD_BASE_URL',       '{$s->input->baseUrl}');
    define('RAD_QUERY_VAR',      '{$s->input->mainQueryVar}');
    define('RAD_BACKEND_PATH',   '{$s->backendPath}');
    define('RAD_WORKSPACE_PATH', '{$s->publicPath}');
    define('RAD_PUBLIC_PATH',    '{$s->publicPath}');
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
            $s->mockFs->expects($this->exactly(3))
                ->method('unlink')
                ->withConsecutive(
                    ["{$s->publicPath}install.php"],
                    ["{$s->publicPath}frontend/rad/install-app.css"],
                    ["{$s->publicPath}frontend/rad/rad-install-app.js"]
                )
                ->willReturn(true);
            $s->mockFs->expects($this->exactly(1))
                ->method('readDir')
                ->with("{$s->backendPath}installer")
                ->willReturn([]);
            $s->mockFs->expects($this->exactly(1))
                ->method('rmDir')
                ->with("{$s->backendPath}installer")
                ->willReturn(true);
            return;
        }
        throw new \Exception('Shouldn\'t happen');
    }
    private function sendInstallRequest($s) {
        $res = $this->createMockResponse(json_encode([
            'ok' => 'ok',
            'siteWasInstalledTo' => $s->workspacePath,
            'warnings' => [],
        ]), 200);
        $ctx = new AppContext(['db' => '@auto', 'auth' => '@auto']);
        $ctx->fs = $s->mockFs;
        $app = $this->makeApp([$this,'createInstallerApp'], $this->getAppConfig(), $ctx);
        $this->sendRequest(new Request('/', 'POST', $s->input), $res, $app);
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
        $this->verifyCreatedMainSchema($s->input->dbDatabase,
                                       $s->input->dbTablePrefix);
        $this->verifyInsertedMainSchemaData($s->input->siteName,
                                            $s->input->siteLang,
                                            "{$s->backendPath}installer/default-acl-rules.php");
        $this->verifyCreatedUserZero($s->input->firstUserName,
                                     $s->input->firstUserEmail,
                                     ACL::ROLE_SUPER_ADMIN);
        $this->verifyContentTypeIsInstalled('Movies', true);
        $this->verifyInsertedSampleContent($s);
    }
}
