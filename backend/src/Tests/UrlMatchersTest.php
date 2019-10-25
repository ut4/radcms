<?php

namespace RadCms\Tests;

use RadCms\Website\UrlMatcherCollection;
use PHPUnit\Framework\TestCase;

final class UrlMatchersTest extends TestCase {
    public function testFindLayoutReturnsLayoutNameBasedOnPassedRules() {
        $matchers = new UrlMatcherCollection();
        $matchers->add('foo', 'file1.php');
        $matchers->add('bar.*', 'file2.php');
        $this->assertEquals('file1.php', $matchers->findLayoutFor('foo'));
        $this->assertEquals('file1.php', $matchers->findLayoutFor('FOO'));
        $this->assertEquals('',          $matchers->findLayoutFor('foos'));
        $this->assertEquals('file2.php', $matchers->findLayoutFor('bar'));
        $this->assertEquals('file2.php', $matchers->findLayoutFor('barss'));
    }
}
