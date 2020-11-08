<?php

namespace RadCms\Tests\Website;

use PHPUnit\Framework\TestCase;
use RadCms\Website\{UrlMatcher, WebsiteControllers};

final class UrlMatchersTest extends TestCase {
    public function testFindLayoutReturnsLayoutName() {
        $matchers = [];
        $matchers[] = new UrlMatcher('foo', 'file1.php');
        $matchers[] = new UrlMatcher('bar.*', 'file2.php');
        $this->assertEquals('file1.php', WebsiteControllers::findLayout($matchers, 'foo')->layoutFileName);
        $this->assertEquals('file1.php', WebsiteControllers::findLayout($matchers, 'FOO')->layoutFileName);
        $this->assertNull(               WebsiteControllers::findLayout($matchers, 'foos'));
        $this->assertEquals('file2.php', WebsiteControllers::findLayout($matchers, 'bar')->layoutFileName);
        $this->assertEquals('file2.php', WebsiteControllers::findLayout($matchers, 'barss')->layoutFileName);
    }
}
