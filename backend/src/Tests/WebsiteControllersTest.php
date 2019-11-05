<?php

namespace RadCms\Tests;

use RadCms\Tests\Self\DbTestCase;
use RadCms\Tests\Self\HttpTestUtils;
use RadCms\Framework\Request;
use RadCms\Framework\FileSystem;
use RadCms\Framework\SessionInterface;
use RadCms\Framework\NativeSession;
use RadCms\Framework\Db;
use RadCms\Tests\Self\ContentTypeDbTestUtils;

final class WebsiteControllersTest extends DbTestCase {
    use HttpTestUtils;
    use ContentTypeDbTestUtils;
    private $afterTest;
    public function tearDown() {
        $this->afterTest->__invoke();
    }
    public function testConstructorScansSiteCfgAndInstallsNewContentTypeToDb() {
        $s = $this->setupTest1();
        $newerThanLastUpdatedAt = $s->mockLastContentTypesUpdatedAt + 10;
        $this->setupDb($s);
        $this->stubFsToReturnNoPlugins($s);
        $this->stubFsToReturnThisLastModTimeForSiteCfg($s, $newerThanLastUpdatedAt);
        $this->stubFsToReturnThisSiteCfg($s, '[ContentType:NewType]' . PHP_EOL .
                                             'friendlyName = My type' . PHP_EOL .
                                             'fields[name] = text');
        //
        $req = new Request('/foo', 'GET');
        $res = $this->createMockResponse('404', 200, 'html');
        $this->makeRequest($req, $res, $s->ctx, $s->setupInjector);
        //
        $this->verifyInstalledNewContentTypeToDb();
    }
    private function setupTest1($testContentTypeName = 'NewType') {
        $s = (object)[
            'ctx' => (object)['fs' => $this->createMock(FileSystem::class)],
            'mockSess' => $this->createMock(SessionInterface::class),
            'setupInjector' => null,
            'mockLastContentTypesUpdatedAt' => 10,
            'testExistingContentTypesJson' => '{}'
        ];
        $s->ctx->fs->method('isFile')
                   ->with($this->stringEndsWith('.tmpl.php'))
                   ->willReturn(true);
        $this->afterTest = function () use ($testContentTypeName) {
            self::$db->exec('UPDATE ${p}websiteState SET' .
                            ' `installedContentTypes` = \'{}\'' .
                            ', `installedContentTypesLastUpdated` = NULL');
            self::$db->exec('DROP TABLE IF EXISTS ${p}' . $testContentTypeName);
        };
        $s->setupInjector = function ($injector) use ($s) {
            $injector->delegate(Db::class, function () {
                return self::$db;
            });
            $injector->delegate(FileSystem::class, function () use ($s) {
                return $s->ctx->fs;
            });
            $injector->delegate(NativeSession::class, function () use ($s) {
                return $s->mockSess;
            });
        };
        return $s;
    }
    private function setupDb($s) {
        if (self::getDb()->exec('UPDATE ${p}websiteState SET' .
                                ' `installedContentTypes` = ?' .
                                ', `installedContentTypesLastUpdated` = ?',
                                [$s->testExistingContentTypesJson,
                                 $s->mockLastContentTypesUpdatedAt]) < 1)
            throw new \RuntimeException('Failed to setup test data.');
    }
    private function stubFsToReturnNoPlugins($s) {
        $s->ctx->fs
            ->method('readDir')
            ->willReturn([]);
    }
    private function stubFsToReturnThisLastModTimeForSiteCfg($s, $mtime) {
        $s->ctx->fs->expects($this->once())
            ->method('lastModTime')
            ->willReturn($mtime);
    }
    private function stubFsToReturnThisSiteCfg($s, $contents) {
        $s->ctx->fs->expects($this->once())
            ->method('read')
            ->with($this->stringEndsWith('site.ini'))
            ->willReturn($contents . PHP_EOL .
                        '[ContentType:Existing]' . PHP_EOL .
                        'friendlyName = Existing type' . PHP_EOL .
                        'fields[name] = text' . PHP_EOL .
                        '[UrlMatcher:d]' . PHP_EOL .
                        'pattern=/' . PHP_EOL .
                        'layout=foo.tmpl.php');
    }
    private function verifyInstalledNewContentTypeToDb() {
        $this->verifyContentTypeIsInstalled('NewType', true, self::$db);
    }


    ////////////////////////////////////////////////////////////////////////////


    public function testConstructorScansSiteCfgAndUninstallsDisappearedContentTypeFromDb() {
        $s = $this->setupTest2();
        $newerThanLastUpdatedAt = $s->mockLastContentTypesUpdatedAt + 10;
        $this->setupDb2($s);
        $this->stubFsToReturnNoPlugins($s);
        $this->stubFsToReturnThisLastModTimeForSiteCfg($s, $newerThanLastUpdatedAt);
        $this->stubFsToReturnThisSiteCfg($s, 'dummy = value');
        //
        $req = new Request('/foo', 'GET');
        $res = $this->createMockResponse('404', 200, 'html');
        $this->makeRequest($req, $res, $s->ctx, $s->setupInjector);
        //
        $this->verifyUninstalledDisappearedContentType();
    }
    private function setupTest2() {
        $s = $this->setupTest1('FromSiteCfg');
        $s->testExistingContentTypesJson = json_encode([
            'FromSiteCfg' => ['FriendlyName', ['field' => 'text'], 'site.ini'],
            'FromSomePlugin' => ['FriendlyName', ['field' => 'text'], 'some-plugin.ini'],
        ]);
        return $s;
    }
    private function setupDb2($s) {
        $this->setupDb($s);
        self::$db->exec('CREATE TABLE ${p}FromSiteCfg (`field` TEXT);');
    }
    private function verifyUninstalledDisappearedContentType() {
        $this->verifyContentTypeIsInstalled('FromSiteCfg', false, self::$db);
        $this->verifyContentTypeIsInstalled('FromSomePlugin', true, self::$db, false);
    }
}
