<?php

namespace RadCms\Tests\Website;

use Pike\TestUtils\DbTestCase;
use Pike\TestUtils\HttpTestUtils;
use Pike\Request;
use Pike\FileSystem;
use RadCms\Tests\_Internal\ContentTestUtils;

final class AdminControllersTest extends DbTestCase {
    use HttpTestUtils;
    use ContentTestUtils;
    private const TEST_EXISTING_CTYPES = [
        'FromSiteCfg' => ['Existing type', ['name' => 'text'], 'site.json'],
        'FromSomePlugin' => ['FriendlyName', ['field' => 'text'], 'some-plugin.json'],
    ];
    public function tearDown() {
        self::clearInstalledContentTypesFromDb();
        self::$db->exec('DROP TABLE IF EXISTS ${p}NewType');
    }
    public function testConstructorScansSiteCfgAndInstallsNewContentTypeToDb() {
        $s = $this->setupDiscoverTest();
        $newerThanLastUpdatedAt = $s->mockLastContentTypesUpdatedAt + 10;
        $this->setTheseContentTypesAsInstalled(self::TEST_EXISTING_CTYPES, $s);
        $this->stubFsToReturnNoPlugins($s);
        $this->stubFsToReturnThisLastModTimeForSiteCfg($s, $newerThanLastUpdatedAt);
        $this->stubFsToReturnThisSiteCfg($s, json_encode(['contentTypes' => [
                                            ['NewType', 'My type', ['name' => 'text']]
                                        ]]));
        //
        $req = new Request('/edit/foo', 'GET');
        $res = $this->createMockResponse($this->anything(), 200, 'html');
        $this->sendRequest($req, $res, '\RadCms\App::create', $s->ctx);
        //
        $this->verifyInstalledNewContentTypeToDb();
    }
    private function setupDiscoverTest() {
        $s = (object)[
            'ctx' => (object)['fs' => $this->createMock(FileSystem::class)],
            'mockLastContentTypesUpdatedAt' => 10,
        ];
        $s->ctx->fs->method('isFile')
                   ->with($this->stringEndsWith('.tmpl.php'))
                   ->willReturn(true);
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
        $parsed = json_decode($contents);
        $parsed->contentTypes[] = ['FromSiteCfg', 'Existing type', ['name' => 'text']];
        $parsed->urlMatchers = [['/', 'foo.tmpl.php']];
        $s->ctx->fs->expects($this->once())
            ->method('read')
            ->with($this->stringEndsWith('site.json'))
            ->willReturn(json_encode($parsed));
    }
    private function verifyInstalledNewContentTypeToDb() {
        $this->verifyContentTypeIsInstalled('NewType', true, self::$db);
    }


    ////////////////////////////////////////////////////////////////////////////


    public function testConstructorScansSiteCfgAndUninstallsDisappearedContentTypeFromDb() {
        $s = $this->setupRemoveTest();
        $newerThanLastUpdatedAt = $s->mockLastContentTypesUpdatedAt + 10;
        $this->setTheseContentTypesAsInstalled(self::TEST_EXISTING_CTYPES + [
            'NewType' => ['My Type', ['name' => 'text'], 'site.json'],
        ], $s);
        $this->stubFsToReturnNoPlugins($s);
        $this->stubFsToReturnThisLastModTimeForSiteCfg($s, $newerThanLastUpdatedAt);
        $this->stubFsToReturnThisSiteCfg($s, '{"contentTypes":['./*NewType disappears*/']}');
        //
        $req = new Request('/edit/foo', 'GET');
        $res = $this->createMockResponse($this->anything(), 200, 'html');
        $this->sendRequest($req, $res, '\RadCms\App::create', $s->ctx);
        //
        $this->verifyUninstalledDisappearedContentType();
    }
    private function setupRemoveTest() {
        return $this->setupDiscoverTest();
    }
    private function verifyUninstalledDisappearedContentType() {
        $this->verifyContentTypeIsInstalled('NewType', false, self::$db);
        $this->verifyContentTypeIsInstalled('FromSiteCfg', true, self::$db, false);
        $this->verifyContentTypeIsInstalled('FromSomePlugin', true, self::$db, false);
    }
}
