<?php

namespace RadCms\Tests\Auth;

use Pike\TestUtils\DbTestCase;
use Pike\TestUtils\HttpTestUtils;
use Pike\Request;
use Pike\Auth\Internal\CachingServicesFactory;
use Pike\SessionInterface;
use Pike\Auth\Authenticator;
use Pike\TestUtils\MockCrypto;
use RadCms\Auth\ACL;

final class AuthControllersTest extends DbTestCase {
    use HttpTestUtils;
    private const TEST_USER_ID = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx';
    private const TEST_USER_ROLE = ACL::ROLE_SUPER_ADMIN;
    protected function setUp() {
        parent::setUp();
        $this->app = $this->makeApp('\RadCms\App::create', $this->getAppConfig());
    }
    public function testPOSTLoginRejectsIfUserWasNotFound() {
        $req = new Request('/api/login', 'POST', (object)['username'=>'doesNotExist',
                                                          'password'=>'irrelevant']);
        $res = $this->createMockResponse(['err' => 'User not found'], 401);
        $this->sendRequest($req, $res, $this->app);
    }


    ////////////////////////////////////////////////////////////////////////////


    public function testPOSTLoginRejectsIfPasswordDidNotMatch() {
        $this->createTestUser();
        $req = new Request('/api/login', 'POST', (object)['username'=>'doesExist',
                                                          'password'=>'wrongPass']);
        $res = $this->createMockResponse(['err' => 'Invalid password'], 401);
        $this->sendRequest($req, $res, $this->app);
    }


    ////////////////////////////////////////////////////////////////////////////


    public function testPOSTLoginPutsUserToSessionOnSuccess() {
        $this->createTestUser();
        $this->expectSessionPutsThisDataToSession((object)[
            'id' => self::TEST_USER_ID,
            'role' => self::TEST_USER_ROLE
        ]);
        $this->sendLoginRequest();
        $this->verifyAuthNowReturnsLoggedInUserId();
    }
    private function expectSessionPutsThisDataToSession($expected) {
        $this->mockAuthenticatorReturnsThisUserAsLoggedInUser(
            $expected,
            function ($mockSession) use ($expected) {
                $mockSession->expects($this->once())->method('put')
                    ->with($this->equalTo('user'),
                           $this->equalTo($expected));
            }
        );
    }
    private function mockAuthenticatorReturnsThisUserAsLoggedInUser($user,
                                                                    $alterMockSession = null) {
        $f = $this->getMockBuilder(CachingServicesFactory::class)
            ->setConstructorArgs([self::$db])
            ->setMethods(['makeSession', 'makeCrypto'])
            ->getMock();
        $s = $this->createMock(SessionInterface::class);
        if ($alterMockSession) $alterMockSession($s);
        $s->method('get')
            ->willReturn($user);
        $f->method('makeSession')->willReturn($s);
        $f->method('makeCrypto')->willReturn(new MockCrypto);
        $ctx = $this->app->getAppCtx();
        $ctx->auth = new Authenticator($f);
    }
    private function sendLoginRequest() {
        $req = new Request('/api/login', 'POST', (object)['username'=>'doesExist',
                                                          'password'=>'mockPass']);
        $res = $this->createMockResponse(['ok' => 'ok'], 200);
        $this->sendRequest($req, $res, $this->app);
    }
    private function verifyAuthNowReturnsLoggedInUserId() {
        $storedUser = $this->app->getAppCtx()->auth->getIdentity();
        $this->assertEquals(self::TEST_USER_ID, $storedUser->id);
        $this->assertEquals(self::TEST_USER_ROLE, $storedUser->role);
    }


    ////////////////////////////////////////////////////////////////////////////


    public function testPOSTUpdatePasswordSavesNewHashedPasswordToDb() {
        $this->createTestUser();
        $s = $this->setupUpdatePassTest();
        $this->mockAuthenticatorReturnsThisUserAsLoggedInUser((object) [
            'id' => self::TEST_USER_ID,
            'role' => self::TEST_USER_ROLE,
        ]);
        $this->sendUpdatePassRequest($s);
        $this->verifyRehashedAndSavedNewPassword($s);
    }
    private function setupUpdatePassTest() {
        return (object) [
            'reqBody' => (object)['userId' => self::TEST_USER_ID,
                                  'newPassword' => 'updated pass']
        ];
    }
    private function sendUpdatePassRequest($s) {
        $req = new Request('/api/update-password', 'POST', $s->reqBody);
        $res = $this->createMockResponse(['ok' => 'ok']);
        $this->sendRequest($req, $res, $this->app);
    }
    private function verifyRehashedAndSavedNewPassword($s) {
        $row = self::$db->fetchOne('SELECT * FROM ${p}users');
        $this->assertIsArray($row);
        $this->assertEquals(MockCrypto::mockHashPass($s->reqBody->newPassword),
                            $row['passwordHash']);
    }
    private function createTestUser() {
        if (self::$db->exec('INSERT INTO ${p}users' .
                            ' (`id`,`username`,`email`,`passwordHash`,`role`)' .
                            ' VALUES (?,?,?,?,?)',
                            [self::TEST_USER_ID,
                             'doesExist',
                             'e@mail.com',
                             'mockPass',
                             self::TEST_USER_ROLE]) < 1)
            throw new \Exception('Failed to create test user');
    }
}
