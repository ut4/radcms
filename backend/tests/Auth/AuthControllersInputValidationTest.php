<?php

namespace RadCms\Tests\Auth;

use Pike\TestUtils\{ConfigProvidingTestCase, HttpTestUtils};
use Pike\Request;

final class AuthControllersInputValidationTest extends ConfigProvidingTestCase {
    use HttpTestUtils;
    private $app;
    protected function setUp(): void {
        parent::setUp();
        $this->app = $this->makeApp('\RadCms\App::create',
                                    $this->getAppConfig(),
                                    '\RadCms\AppContext');
    }
    public function testPOSTLoginRejectsEmptyInput() {
        $req = new Request('/api/login', 'POST', new \stdClass);
        $res = $this->makeSpyingResponse();
        $this->sendRequest($req, $res, $this->app);
        $this->verifyResponseMetaEquals(400, 'application/json', $res);
        $this->verifyResponseBodyEquals(['The length of username must be at least 1',
                                         'The length of password must be at least 1'],
                                        $res);
    }
    public function testPOSTLoginRejectsEmptyValues() {
        $req = new Request('/api/login', 'POST', (object)['username' => '',
                                                          'password' => '']);
        $res = $this->makeSpyingResponse();
        $this->sendRequest($req, $res, $this->app);
        $this->verifyResponseMetaEquals(400, 'application/json', $res);
        $this->verifyResponseBodyEquals(['The length of username must be at least 1',
                                         'The length of password must be at least 1'],
                                        $res);
    }
    public function testPOSTUpdatePasswordRejectsInvalidValues() {
        $req = new Request('/api/update-password', 'POST', (object)['userId' => '',
                                                                    'newPassword' => '']);
        $res = $this->makeSpyingResponse();
        $this->sendRequest($req, $res, $this->app);
        $this->verifyResponseMetaEquals(400, 'application/json', $res);
        $this->verifyResponseBodyEquals(['The length of userId must be at least 36',
                                         'The length of newPassword must be at least 1'],
                                        $res);
    }
}
