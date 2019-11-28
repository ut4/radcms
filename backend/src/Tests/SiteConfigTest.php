<?php

namespace RadCms\Tests;

use RadCms\Website\SiteConfig;
use PHPUnit\Framework\TestCase;
use RadCms\Framework\FileSystem;
use RadCms\Common\RadException;

final class SiteConfigTest extends TestCase {
    public function testSelfLoadRejectsMissingValues() {
        $s = $this->setupValidateTest();
        $this->stubFsToReturnThisSiteCfg($s, '{}');
        $this->loadInvalidSiteCfg($s);
        $this->verifyTheseErrorsWereReported($s,
            '`{..."urlMatchers": ["pattern", "layout-file.tmpl.php"]...}` is required',
            '`{..."contentTypes": ["MyType", "Friendly name", {"name": "datatype"}]...}` is required');
    }
    private function setupValidateTest() {
        return (object)[
            'mockFs' => $this->createMock(FileSystem::class),
            'errors' => 'no-errors',
        ];
    }
    private function stubFsToReturnThisSiteCfg($s, $contents) {
        $s->mockFs->method('read')->willReturn($contents);
    }
    private function loadInvalidSiteCfg($s) {
        try {
            (new SiteConfig($s->mockFs))->selfLoad('', false);
        } catch (RadException $e) {
            $s->errors = $e->getMessage();
        }
    }
    private function verifyTheseErrorsWereReported($s, ...$expectedErrors) {
        $lines = explode(PHP_EOL, $s->errors);
        foreach ($expectedErrors as $e)
            $this->assertContains($e, $lines);
    }


    ////////////////////////////////////////////////////////////////////////////


    public function testSelfLoadRejectsInvalidAssetFilesValues() {
        $s = $this->setupAssetValidateTest();
        $this->stubFsToReturnThisSiteCfg($s, json_encode(['assetFiles' => [
                                                 [],
                                                 ['foo.css', 'invalid'],
                                                 ['foo.css', 'local-stylesheet', 'invalid'],
                                             ]]));
        $this->loadInvalidSiteCfg($s);
        $this->verifyTheseErrorsWereReported($s,
            'Invalid assetFile #0, should be {..."assetFiles": [["file.ext", "asset-type", {"html-attr": "value"}?]]...}',
            'Invalid assetFile type, should be one of ' . $s->assetFileTypesStr,
            'assetFile->attrs must be an object');
    }
    private function setupAssetValidateTest() {
        $s = $this->setupValidateTest();
        $s->assetFileTypesStr = implode('|', SiteConfig::ASSET_TYPES);
        return $s;
    }
}
