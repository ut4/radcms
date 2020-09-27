<?php

namespace RadCms\Tests\Website;

use PHPUnit\Framework\TestCase;
use RadCms\Website\{UrlMatcher, WebsiteControllers};

final class UrlMatchersTest extends TestCase {
    public function testFindLayoutReturnsLayoutName() {
        $matchers = [];
        $matchers[] = new UrlMatcher('foo', 'file1.php');
        $matchers[] = new UrlMatcher('bar.*', 'file2.php');
        $this->assertEquals('file1.php', WebsiteControllers::findLayout($matchers, 'foo'));
        $this->assertEquals('file1.php', WebsiteControllers::findLayout($matchers, 'FOO'));
        $this->assertEquals('',          WebsiteControllers::findLayout($matchers, 'foos'));
        $this->assertEquals('file2.php', WebsiteControllers::findLayout($matchers, 'bar'));
        $this->assertEquals('file2.php', WebsiteControllers::findLayout($matchers, 'barss'));
    }
}
