<?php

namespace RadCms\Tests\User;

use Pike\TestUtils\DbTestCase;
use Pike\TestUtils\HttpTestUtils;
use Pike\Request;
use Pike\Auth\Authenticator;
use Pike\Response;
use RadCms\Auth\ACL;

final class UserControllersTest extends DbTestCase {
    use HttpTestUtils; // makeApp(), sendRequest()
    public function tearDown(): void {
        self::$db->exec('DELETE FROM ${p}users');
    }
    public function testHandleGetCurrentUserReturnsCurrentUserDetails() {
        $s = $this->setupGetCurrentUserTest();
        $this->sendHandleGetCurrentUserRequest($s);
        $this->verifyReturnedCurrentUserDetails($s);
    }
    private function setupGetCurrentUserTest() {
        $out = new \stdClass;
        $out->testUser = $this->makeAndInsertTestUser();
        $out->ctx = new \stdClass;
        $out->ctx->auth = $this->createMock(Authenticator::class);
        $out->ctx->auth->method('getIdentity')
            ->willReturn((object)['id' => $out->testUser['id'],
                                  'role' => $out->testUser['role']]);
        $out->actualResponseBody = null;
        return $out;
    }
    private function makeAndInsertTestUser() {
        $out = ['id' => 'abc',
                'username' => 'foo',
                'email' => 'e@mail.com',
                'passwordHash' => 'mock',
                'role' => ACL::ROLE_SUPER_ADMIN];
        [$cols, $qs, $vals] = self::makeSelectColumnBinders($out);
        self::$db->exec("INSERT INTO \${p}users ({$cols}) VALUES ({$qs})", $vals);
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
        $this->assertEquals($s->testUser['id'], $user->id);
        $this->assertEquals($s->testUser['username'], $user->username);
        $this->assertEquals($s->testUser['email'], $user->email);
        $this->assertEquals($s->testUser['role'], $user->role);
    }
    private static function makeSelectColumnBinders($data) {
        $cols = [];
        $qs = [];
        $vals = [];
        foreach ($data as $key => $val) {
            $cols[] = "`${key}`";
            $qs[] = '?';
            $vals[] = $val;
        }
        return [implode(',', $cols), implode(',', $qs), $vals];
    }
}
