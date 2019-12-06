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
            ['username must be a non-empty string',
            'password must be a non-empty string'], 400);
        $this->sendRequest($req, $res);
    }
    public function testPOSTLoginRejectsEmptyValues() {
        $req = new Request('/login', 'POST', (object)['username'=>'',
                                                      'password'=>'']);
        $res = $this->createMockResponse(
            ['username must be a non-empty string',
            'password must be a non-empty string'], 400);
        $this->sendRequest($req, $res);
    }
}
