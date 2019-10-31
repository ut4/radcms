<?php

namespace RadCms\Tests;

use PHPUnit\Framework\TestCase;
use RadCms\Tests\Self\HttpTestUtils;
use RadCms\Framework\Request;

final class AuthControllersInputValidationTest extends TestCase {
    use HttpTestUtils;
    public function testPOSTLoginRejectsEmptyInput() {
        $req = new Request('/login', 'POST', new \stdClass);
        $res = $this->createMockResponse(
            ['username !present',
            'password !present'], 400);
        $this->makeRequest($req, $res);
    }
    public function testPOSTLoginRejectsEmptyValues() {
        $req = new Request('/login', 'POST', (object)['username'=>'',
                                                      'password'=>'']);
        $res = $this->createMockResponse(
            ['username !present',
            'password !present'], 400);
        $this->makeRequest($req, $res);
    }
}
