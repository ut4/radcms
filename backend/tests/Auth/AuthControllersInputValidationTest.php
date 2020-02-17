<?php

namespace RadCms\Tests\Auth;

use Pike\TestUtils\ConfigProvidingTestCase;
use Pike\TestUtils\HttpTestUtils;
use Pike\Request;

final class AuthControllersInputValidationTest extends ConfigProvidingTestCase {
    use HttpTestUtils;
    private $app;
    protected function setUp() {
        parent::setUp();
        $this->app = $this->makeApp('\RadCms\App::create', $this->getAppConfig());
    }
    public function testPOSTLoginRejectsEmptyInput() {
        $req = new Request('/api/login', 'POST', new \stdClass);
        $res = $this->createMockResponse(
            ['username must be a non-empty string',
             'password must be a non-empty string'], 400);
        $this->sendRequest($req, $res, $this->app);
    }
    public function testPOSTLoginRejectsEmptyValues() {
        $req = new Request('/api/login', 'POST', (object)['username' => '',
                                                          'password' => '']);
        $res = $this->createMockResponse(
            ['username must be a non-empty string',
             'password must be a non-empty string'], 400);
        $this->sendRequest($req, $res, $this->app);
    }
}
