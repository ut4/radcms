<?php

namespace RadCms\Tests;

use RadCms\Website\LayoutLookup;
use PHPUnit\Framework\TestCase;

final class LayoutLookupTest extends TestCase {
    public function testGetLayoutReturnsLayoutNameBasedOnPassedRules() {
        $rule1 = (object)['pattern' => 'foo', 'layoutFileName' => 'file1.php'];
        $rule2 = (object)['pattern' => 'bar.*', 'layoutFileName' => 'file2.php'];
        $ll = new LayoutLookup([$rule1, $rule2]);
        $this->assertEquals($rule1->layoutFileName, $ll->findLayoutFor('foo'));
        $this->assertEquals($rule1->layoutFileName, $ll->findLayoutFor('FOO'));
        $this->assertEquals('',                     $ll->findLayoutFor('foos'));
        $this->assertEquals($rule2->layoutFileName, $ll->findLayoutFor('bar'));
        $this->assertEquals($rule2->layoutFileName, $ll->findLayoutFor('barss'));
    }
}
