<?php

namespace RadCms\Tests\Website;

use RadCms\Website\SiteConfig;
use PHPUnit\Framework\TestCase;
use Pike\FileSystem;
use Pike\PikeException;

final class SiteConfigTest extends TestCase {
    public function testSelfLoadRejectsMissingValues() {
        $s = $this->setupValidateTest();
        $this->stubFsToReturnThisSiteCfg($s, '{}');
        $this->loadInvalidSiteCfg($s);
        $this->verifyTheseErrorsWereReported($s,
            '{..."urlMatchers": ["pattern", "layout.php"]} is required');
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
            (new SiteConfig($s->mockFs))->selfLoad('');
        } catch (PikeException $e) {
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
            'assetFile must be an array',
            'assetFile[1][1] (file type) must be ' . $s->assetFileTypesStr,
            'assetFile[2][2] (attrs) must be a \stdClass');
    }
    private function setupAssetValidateTest() {
        $s = $this->setupValidateTest();
        $s->assetFileTypesStr = implode('|', SiteConfig::ASSET_TYPES);
        return $s;
    }


    ////////////////////////////////////////////////////////////////////////////


    public function testSelfLoadLoadsAllValues() {
        $s = $this->setupLoadAllTest();
        $this->stubFsToReturnThisSiteCfg($s, json_encode([
            'urlMatchers' => [['/regexp.', 'path/to/file.tmpl.php']],
            'assetFiles' => [['main.css', 'local-stylesheet']],
        ]));
        $this->loadSiteConfig($s);
        $this->verifyLoadedUrlMatchers($s);
        $this->verifyLoadedAssets($s);
    }
    private function setupLoadAllTest() {
        $s = $this->setupValidateTest();
        $s->actuallyLoadedUrlMatchers = null;
        $s->actuallyLoadedCssAssets = null;
        $s->actuallyLoadedJsAssets = null;
        return $s;
    }
    private function loadSiteConfig($s) {
        $siteConfig = new SiteConfig($s->mockFs);
        $siteConfig->selfLoad('', false);
        $s->actuallyLoadedUrlMatchers = $siteConfig->urlMatchers;
        $s->actuallyLoadedCssAssets = $siteConfig->cssAssets;
        $s->actuallyLoadedJsAssets = $siteConfig->jsAssets;
    }
    private function verifyLoadedUrlMatchers($s) {
        $this->assertEquals(
            json_encode([[
                'pattern' => '/^\\/regexp.$/i',
                'layoutFileName' => 'path/to/file.tmpl.php'
            ]]),
            json_encode($s->actuallyLoadedUrlMatchers)
        );
    }
    private function verifyLoadedAssets($s) {
        $this->assertEquals(
            [(object)['url'=>'main.css','type'=>'local-stylesheet','attrs'=>[]]],
            $s->actuallyLoadedCssAssets
        );
        $this->assertEquals('[]', json_encode($s->actuallyLoadedJsAssets));
    }
}
