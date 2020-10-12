<?php

namespace RadCms\Tests\User;

use Pike\Auth\Authenticator;
use Pike\Interfaces\SessionInterface;
use Pike\TestUtils\{DbTestCase, HttpTestUtils, MockCrypto};
use RadCms\AppContext;
use RadCms\Auth\ACL;
use RadCms\Tests\_Internal\ApiRequestFactory;

final class UserControllersTest extends DbTestCase {
    use HttpTestUtils; // makeApp(), sendRequest()
    public function tearDown(): void {
        parent::tearDown();
        self::deleteTestUsers();
    }
    public function testHandleGetCurrentUserReturnsCurrentUserDetails() {
        $s = $this->setupGetCurrentUserTest();
        $this->sendHandleGetCurrentUserRequest($s);
        $this->verifyReturnedCurrentUserDetails($s);
    }
    private function setupGetCurrentUserTest() {
        $out = new \stdClass;
        $out->testUser = self::makeAndInsertTestUser();
        $out->ctx = new AppContext(['db' => '@auto']);
        $out->ctx->auth = new Authenticator(
            function ($_factory) { },
            function ($_factory) use ($out) {
                $mockSession = $this->createMock(SessionInterface::class);
                $mockSession->method('get')->with('user')
                    ->willReturn((object) ['id' => $out->testUser->id,
                                           'role' => $out->testUser->role]);
                return $mockSession;
            },
            function ($_factory) { },
            '',   // $userRoleCookieName
            false // doUseRememberMe
        );
        $out->spyingResponse = null;
        return $out;
    }
    private function sendHandleGetCurrentUserRequest($s) {
        $req = ApiRequestFactory::create('/api/users/me', 'GET');
        $s->spyingResponse = $this->makeSpyingResponse();
        $app = $this->makeApp('\RadCms\App::create', [], $s->ctx);
        $this->sendRequest($req, $s->spyingResponse, $app);
    }
    private function verifyReturnedCurrentUserDetails($s) {
        $this->verifyResponseMetaEquals(200, 'application/json', $s->spyingResponse);
        $user = json_decode($s->spyingResponse->getActualBody());
        $this->assertEquals($s->testUser->id, $user->id);
        $this->assertEquals($s->testUser->username, $user->username);
        $this->assertEquals($s->testUser->email, $user->email);
        $this->assertEquals($s->testUser->role, $user->role);
    }
    public static function makeAndInsertTestUser() {
        $out = ['id' => 'xxxxxxxx-xxxx-5xxx-yxxx-xxxxxxxxxxxx',
                'username' => 'foo',
                'email' => 'e@mail.com',
                'passwordHash' => MockCrypto::mockHashPass('pass'),
                'role' => ACL::ROLE_SUPER_ADMIN,
                'accountCreatedAt' => time()];
        [$qList, $vals, $cols] = self::$db->makeInsertQParts($out);
        self::$db->exec("INSERT INTO \${p}users ({$cols}) VALUES ({$qList})", $vals);
        return (object) $out;
    }
    public static function deleteTestUsers() {
        self::$db->exec('DELETE FROM ${p}users');
    }
}
