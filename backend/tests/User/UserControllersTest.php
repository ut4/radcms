<?php

namespace RadCms\Tests\User;

use Pike\TestUtils\DbTestCase;
use Pike\TestUtils\HttpTestUtils;
use Pike\Request;
use Pike\Auth\Authenticator;
use Pike\DbUtils;
use Pike\Response;
use RadCms\Auth\ACL;
use Pike\TestUtils\MockCrypto;
use RadCms\AppContext;

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
        $out->ctx->auth = $this->createMock(Authenticator::class);
        $out->ctx->auth->method('getIdentity')
            ->willReturn((object)['id' => $out->testUser->id,
                                  'role' => $out->testUser->role]);
        $out->actualResponseBody = null;
        return $out;
    }
    private function sendHandleGetCurrentUserRequest($s) {
        $req = new Request('/api/users/me', 'GET');
        $res = $this->createMock(Response::class);
        $app = $this->makeApp('\RadCms\App::create', [], $s->ctx);
        $this->sendResponseBodyCapturingRequest($req, $res, $app, $s);
    }
    private function verifyReturnedCurrentUserDetails($s) {
        $user = json_decode($s->actualResponseBody);
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
