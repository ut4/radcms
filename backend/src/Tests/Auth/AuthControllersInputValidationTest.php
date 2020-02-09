<?php

namespace RadCms\Tests\Auth;

use PHPUnit\Framework\TestCase;
use Pike\TestUtils\HttpTestUtils;
use Pike\Request;

final class AuthControllersInputValidationTest extends TestCase {
    use HttpTestUtils;
    public function testPOSTLoginRejectsEmptyInput() {
        $req = new Request('/api/login', 'POST', new \stdClass);
        $res = $this->createMockResponse(
            ['username must be a non-empty string',
            'password must be a non-empty string'], 400);
        $this->sendRequest($req, $res, '\RadCms\App::create');
    }
    public function testPOSTLoginRejectsEmptyValues() {
        $req = new Request('/api/login', 'POST', (object)['username'=>'',
                                                          'password'=>'']);
        $res = $this->createMockResponse(
            ['username must be a non-empty string',
            'password must be a non-empty string'], 400);
        $this->sendRequest($req, $res, '\RadCms\App::create');
    }
}
