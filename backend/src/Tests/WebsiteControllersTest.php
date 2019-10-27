<?php

namespace RadCms\Tests;

use RadCms\Tests\Self\DbTestCase;
use RadCms\Tests\Self\HttpTestUtils;
use RadCms\Framework\Request;
use RadCms\Framework\FileSystem;
use RadCms\Framework\SessionInterface;
use RadCms\Framework\NativeSession;
use RadCms\Framework\Db;

final class WebsiteControllersTest extends DbTestCase {
    use HttpTestUtils;
    /**
     * @after
     */
    public function afterEach() {
        $this->afterTest->__invoke();
    }
    public function testConstructorScansSiteIniAndInstallsNewContentTypeToDb() {
        $s = $this->setupTest1();
        $mockLastContentTypesUpdatedAt = 10;
        $newerThanLastUpdatedAt = $mockLastContentTypesUpdatedAt + 10;
        $this->setupDb($mockLastContentTypesUpdatedAt);
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
    private function setupTest1() {
        $s = (object)[
            'mockFs' => $this->createMock(FileSystem::class),
            'mockSess' => $this->createMock(SessionInterface::class),
            'setupInjector' => null,
        ];
        $this->afterTest = function () {
            self::$db->exec('UPDATE ${p}websiteState SET' .
                            ' `installedContentTypes` = \'{}\'' .
                            ', `installedContentTypesLastUpdated` = NULL');
            self::$db->exec('DROP TABLE ${p}NewType');
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
    private function setupDb($mockLastContentTypesUpdatedAt) {
        if (self::getDb()->exec('UPDATE ${p}websiteState SET' .
                                ' `installedContentTypes` = ?' .
                                ', `installedContentTypesLastUpdated` = ?',
                                ['{}', $mockLastContentTypesUpdatedAt]) < 1)
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
        $this->assertEquals(1, count(self::$db->fetchAll(
            'SELECT `table_name` FROM information_schema.tables' .
            ' WHERE `table_schema` = ? AND `table_name` = ?',
            [self::$db->database, self::$db->tablePrefix . 'NewType']
        )));
        $this->assertEquals(1, self::$db->fetchOne(
            'SELECT JSON_CONTAINS_PATH(`installedContentTypes`, \'one\',' .
            ' \'$."NewType"\') as `containsKey` FROM ${p}websiteState'
        )['containsKey']);
    }
}
