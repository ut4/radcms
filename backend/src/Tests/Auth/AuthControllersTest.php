<?php

namespace RadCms\Tests\Auth;

use Pike\TestUtils\DbTestCase;
use Pike\TestUtils\HttpTestUtils;
use Pike\Request;
use Pike\Auth\Internal\CachingServicesFactory;
use Pike\SessionInterface;
use Pike\Auth\Authenticator;
use Pike\TestUtils\MockCrypto;

final class AuthControllersTest extends DbTestCase {
    use HttpTestUtils;
    public function testPOSTLoginRejectsIfUserWasNotFound() {
        $req = new Request('/api/login', 'POST', (object)['username'=>'doesNotExist',
                                                          'password'=>'irrelevant']);
        $res = $this->createMockResponse(['err' => 'User not found'], 401);
        $this->sendRequest($req, $res, '\RadCms\App::create');
    }
    public function testPOSTLoginRejectsIfPasswordDidNotMatch() {
        $this->createTestUser();
        $req = new Request('/api/login', 'POST', (object)['username'=>'doesExist',
                                                          'password'=>'wrongPass']);
        $res = $this->createMockResponse(['err' => 'Invalid password'], 401);
        $this->sendRequest($req, $res, '\RadCms\App::create');
    }
    public function testPOSTLoginPutsUserToSessionOnSuccess() {
        $this->createTestUser();
        $req = new Request('/api/login', 'POST', (object)['username'=>'doesExist',
                                                          'password'=>'mockPass']);
        $res = $this->createMockResponse(['ok' => 'ok'], 200);
        $f = $this->getMockBuilder(CachingServicesFactory::class)
            ->setConstructorArgs([self::$db, new MockCrypto])
            ->setMethods(['makeSession'])
            ->getMock();
        $s = $this->createMock(SessionInterface::class);
        $s->expects($this->once())->method('put')
            ->with($this->equalTo('user'),
                    $this->equalTo('xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'));
        $s->method('get')
            ->willReturn('xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx');
        $f->method('makeSession')->willReturn($s);
        $ctx = (object)['auth' => new Authenticator($f)];
        $this->sendRequest($req, $res, '\RadCms\App::create', $ctx);
        //
        $this->verifyAuthNowReturnsLoggedInUserId($ctx);
    }
    private function verifyAuthNowReturnsLoggedInUserId($ctx) {
        $storedUserId = $ctx->auth->getIdentity();
        $this->assertEquals('xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx', $storedUserId);
    }
    private function createTestUser() {
        if (self::$db->exec('INSERT INTO ${p}users' .
                            ' (`id`,`username`,`email`,`passwordHash`)' .
                            ' VALUES (?,?,?,?)',
                            ['xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx',
                            'doesExist', 'e@mail.com','mockPass']) < 1)
            throw new \Exception('Failed to create test user');
    }
}
