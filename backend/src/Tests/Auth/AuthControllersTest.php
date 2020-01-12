<?php

namespace RadCms\Tests\Auth;

use Pike\TestUtils\DbTestCase;
use Pike\TestUtils\HttpTestUtils;
use Pike\Request;
use Pike\Auth\CachingServicesFactory;
use Pike\SessionInterface;
use Pike\Auth\UserRepository;
use Pike\Auth\Authenticator;
use Pike\TestUtils\MockCrypto;

final class AuthControllersTest extends DbTestCase {
    use HttpTestUtils;
    private $afterTest;
    public function tearDown() {
        $this->afterTest->__invoke();
    }
    public function testPOSTLoginRejectsIfUserWasNotFound() {
        $this->afterTest = function () {};
        //
        $req = new Request('/login', 'POST', (object)['username'=>'doesNotExist',
                                                      'password'=>'irrelevant']);
        $res = $this->createMockResponse(['err' => 'User not found'], 401);
        $this->sendRequest($req, $res, '\RadCms\App::create');
    }
    public function testPOSTLoginRejectsIfPasswordDidntMatch() {
        $this->createTestUser();
        $this->afterTest = function () { $this->removeTestUser(); };
        //
        $req = new Request('/login', 'POST', (object)['username'=>'doesExist',
                                                      'password'=>'wrongPass']);
        $res = $this->createMockResponse(['err' => 'Invalid password'], 401);
        $this->sendRequest($req, $res, '\RadCms\App::create');
    }
    public function testPOSTLoginPutsUserToSessionOnSuccess() {
        $this->createTestUser();
        $this->afterTest = function () { $this->removeTestUser(); };
        //
        $req = new Request('/login', 'POST', (object)['username'=>'doesExist',
                                                      'password'=>'mockPass']);
        $res = $this->createMockResponse(['ok' => 'ok'], 200);
        $f = $this->createMock(CachingServicesFactory::class);
        $f->method('makeUserRepo')->willReturn(new UserRepository(self::$db));
        $s = $this->createMock(SessionInterface::class);
        $s->expects($this->once())->method('put')
            ->with($this->equalTo('user'),
                    $this->equalTo('xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'));
        $s->method('get')
            ->willReturn('xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx');
        $f->method('makeSession')->willReturn($s);
        $ctx = (object)['auth' => new Authenticator(new MockCrypto, $f)];
        $this->sendRequest($req, $res, '\RadCms\App::create', $ctx);
        //
        $this->verifyAuthNowReturnsLoggedInUserId($ctx);
    }
    private function verifyAuthNowReturnsLoggedInUserId($ctx) {
        $storedUserId = $ctx->auth->getIdentity();
        $this->assertEquals('xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx', $storedUserId);
    }
    private function createTestUser() {
        if ($this->getDb()->exec('INSERT INTO ${p}users VALUES (?,?,?,?)',
                                 ['xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx',
                                  'doesExist', 'e@mail.com','mockPass']) < 1)
            throw new \Exception('Failed to create test user');
    }
    private function removeTestUser() {
        if ($this->getDb()->exec('DELETE FROM ${p}users') < 1)
            throw new \Exception('Failed to remove test user');
    }
}
