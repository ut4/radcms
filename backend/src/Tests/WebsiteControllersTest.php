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
    private const TEST_EXISTING_CTYPES = [
        'FromSiteIni' => ['Existing type', ['name' => 'text'], 'site.ini'],
        'FromSomePlugin' => ['FriendlyName', ['field' => 'text'], 'some-plugin.ini'],
    ];
    public function tearDown() {
        InstallerTest::clearInstalledContentTypesFromDb();
        self::$db->exec('DROP TABLE IF EXISTS ${p}NewType');
    }
    public function testConstructorScansSiteCfgAndInstallsNewContentTypeToDb() {
        $s = $this->setupTest1();
        $newerThanLastUpdatedAt = $s->mockLastContentTypesUpdatedAt + 10;
        $this->setTheseContentTypesAsInstalled(self::TEST_EXISTING_CTYPES, $s);
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
    private function setupTest1() {
        $s = (object)[
            'ctx' => (object)['fs' => $this->createMock(FileSystem::class)],
            'mockSess' => $this->createMock(SessionInterface::class),
            'setupInjector' => null,
            'mockLastContentTypesUpdatedAt' => 10,
        ];
        $s->ctx->fs->method('isFile')
                   ->with($this->stringEndsWith('.tmpl.php'))
                   ->willReturn(true);
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
    private function setTheseContentTypesAsInstalled($compactContentTypes, $s) {
        if (self::getDb()->exec('UPDATE ${p}websiteState SET' .
                                ' `installedContentTypes` = ?' .
                                ', `installedContentTypesLastUpdated` = ?',
                                [json_encode($compactContentTypes),
                                 $s->mockLastContentTypesUpdatedAt]) < 1)
            throw new \RuntimeException('Failed to setup test data.');
        if (array_key_exists('NewType', $compactContentTypes))
            self::getDb()->exec('CREATE TABLE ${p}NewType (`id` INTEGER);');
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
                        '[ContentType:FromSiteIni]' . PHP_EOL .
                        'friendlyName = Existing type' . PHP_EOL .
                        'fields[name] = text' . PHP_EOL .
                        '[UrlMatcher:Name]' . PHP_EOL .
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
        $this->setTheseContentTypesAsInstalled(self::TEST_EXISTING_CTYPES + [
            'NewType' => ['My Type', ['name' => 'text'], 'site.ini'],
        ], $s);
        $this->stubFsToReturnNoPlugins($s);
        $this->stubFsToReturnThisLastModTimeForSiteCfg($s, $newerThanLastUpdatedAt);
        $this->stubFsToReturnThisSiteCfg($s, 'NewType = disappears');
        //
        $req = new Request('/foo', 'GET');
        $res = $this->createMockResponse('404', 200, 'html');
        $this->makeRequest($req, $res, $s->ctx, $s->setupInjector);
        //
        $this->verifyUninstalledDisappearedContentType();
    }
    private function setupTest2() {
        return $this->setupTest1();
    }
    private function verifyUninstalledDisappearedContentType() {
        $this->verifyContentTypeIsInstalled('NewType', false, self::$db);
        $this->verifyContentTypeIsInstalled('FromSiteIni', true, self::$db, false);
        $this->verifyContentTypeIsInstalled('FromSomePlugin', true, self::$db, false);
    }
}
