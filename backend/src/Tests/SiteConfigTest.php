<?php

namespace RadCms\Tests;

use RadCms\Website\SiteConfig;
use PHPUnit\Framework\TestCase;
use RadCms\Framework\FileSystem;
use RadCms\Common\RadException;

final class SiteConfigTest extends TestCase {
    public function testFoo() {
        $s = $this->setupTest1();
        $this->stubFsToReturnThisSiteCfg($s, 'dum=my');
        $this->loadInvalidSiteCfg($s);
        $this->verifyTheseErrorsWereReported($s,
            'At least one `[UrlMatcher:name] pattern = /some-url` is required',
            'At least one `[ContentType:MyContentType] fields[name] = data-type` is required');
    }
    private function setupTest1() {
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


    public function testBar() {
        $s = $this->setupTest2();
        $this->stubFsToReturnThisSiteCfg($s, '[AssetFile:0]' . PHP_EOL .
                                             'no-url = here' . PHP_EOL .
                                             'no-type = here' . PHP_EOL .
                                             '[AssetFile:1]' . PHP_EOL .
                                             'url = foo.css' . PHP_EOL .
                                             'type = invalid');
        $this->loadInvalidSiteCfg($s);
        $this->verifyTheseErrorsWereReported($s,
            '[AssetFile:name] must define field `type = ' . $s->assetFileTypesStr . '`',
            '[AssetFile:name] must define field `url = file.css`',
            '[AssetFile:name] must define field `type = ' . $s->assetFileTypesStr . '`');
    }
    private function setupTest2() {
        $s = $this->setupTest1();
        $s->assetFileTypesStr = implode('|', SiteConfig::ASSET_TYPES);
        return $s;
    }
}
