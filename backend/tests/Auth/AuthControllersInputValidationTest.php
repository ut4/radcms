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
            ['The length of username must be at least 1',
             'The length of password must be at least 1'], 400);
        $this->sendRequest($req, $res, $this->app);
    }
    public function testPOSTLoginRejectsEmptyValues() {
        $req = new Request('/api/login', 'POST', (object)['username' => '',
                                                          'password' => '']);
        $res = $this->createMockResponse(
            ['The length of username must be at least 1',
             'The length of password must be at least 1'], 400);
        $this->sendRequest($req, $res, $this->app);
    }
}
