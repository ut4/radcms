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
    public function testConstructorScansSiteIniAndInstallsNewContentTypeToDb() {
        $s = $this->setupTest1();
        $newerThanLastUpdatedAt = $s->mockLastContentTypesUpdatedAt + 10;
        $this->setupDb($s);
        $this->stubFsToReturnNoPlugins($s);
        $this->stubFsToReturnThisLastModTimeForSiteIni($s, $newerThanLastUpdatedAt);
        $this->stubFsToReturnThisSiteIni($s, '[ContentType:NewType]' . PHP_EOL .
                                             'friendlyName = My type' . PHP_EOL .
                                             'fields[name] = text');
        //
        $req = new Request('/foo', 'GET');
        $res = $this->createMockResponse('404', 200);
        $this->makeRequest($req, $res, $s->mockFs, $s->setupInjector);
        //
        $this->verifyInstalledNewContentTypeToDb();
    }
    private function setupTest1($testContentTypeName = 'NewType') {
        $s = (object)[
            'mockFs' => $this->createMock(FileSystem::class),
            'mockSess' => $this->createMock(SessionInterface::class),
            'setupInjector' => null,
            'mockLastContentTypesUpdatedAt' => 10,
            'testExistingContentTypesJson' => '{}'
        ];
        $this->afterTest = function () use ($testContentTypeName) {
            self::$db->exec('UPDATE ${p}websiteState SET' .
                            ' `installedContentTypes` = \'{}\'' .
                            ', `installedContentTypesLastUpdated` = NULL');
            self::$db->exec('DROP TABLE IF EXISTS ${p}' . $testContentTypeName);
        };
        $s->setupInjector = function ($injector) use ($s) {
            $injector->delegate(Db::class, function () use ($s) {
                return self::$db;
            });
            $injector->delegate(FileSystem::class, function () use ($s) {
                return $s->mockFs;
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
        $s->mockFs
            ->method('readDir')
            ->willReturn([]);
    }
    private function stubFsToReturnThisLastModTimeForSiteIni($s, $mtime) {
        $s->mockFs->expects($this->once())
            ->method('lastModTime')
            ->willReturn($mtime);
    }
    private function stubFsToReturnThisSiteIni($s, $contents) {
        $s->mockFs->expects($this->once())
            ->method('read')
            ->with($this->stringEndsWith('site.ini'))
            ->willReturn($contents);
    }
    private function verifyInstalledNewContentTypeToDb() {
        $this->verifyContentTypeIsInstalled('NewType', true, self::$db);
    }


    ////////////////////////////////////////////////////////////////////////////


    public function testConstructorScansSiteIniAndUninstallsDisappearedContentTypeFromDb() {
        $s = $this->setupTest2();
        $newerThanLastUpdatedAt = $s->mockLastContentTypesUpdatedAt + 10;
        $this->setupDb2($s);
        $this->stubFsToReturnNoPlugins($s);
        $this->stubFsToReturnThisLastModTimeForSiteIni($s, $newerThanLastUpdatedAt);
        $this->stubFsToReturnThisSiteIni($s, 'dummy = value');
        //
        $req = new Request('/foo', 'GET');
        $res = $this->createMockResponse('404', 200);
        $this->makeRequest($req, $res, $s->mockFs, $s->setupInjector);
        //
        $this->verifyUninstalledDisappearedContentType();
    }
    private function setupTest2() {
        $s = $this->setupTest1('FromSiteIni');
        $s->testExistingContentTypesJson = json_encode([
            'FromSiteIni' => ['FriendlyName', ['field' => 'text'], 'site.ini'],
            'FromSomePlugin' => ['FriendlyName', ['field' => 'text'], 'some-plugin.ini'],
        ]);
        return $s;
    }
    private function setupDb2($s) {
        $this->setupDb($s);
        self::$db->exec('CREATE TABLE ${p}FromSiteIni (`field` TEXT);');
    }
    private function verifyUninstalledDisappearedContentType() {
        $this->verifyContentTypeIsInstalled('FromSiteIni', false, self::$db);
        $this->verifyContentTypeIsInstalled('FromSomePlugin', true, self::$db, false);
    }
}
