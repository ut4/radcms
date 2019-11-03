<?php

namespace RadCms\Tests\Self;

use RadCms\App;
use Auryn\Injector;
use RadCms\Framework\Response;
use RadCms\Framework\FileSystemInterface;
use RadCms\Auth\Authenticator;

trait HttpTestUtils {
    /**
     * @param string $expectedBody
     * @param string $expectedStatus = 200
     * @param string $expectedContentType = 'json'
     * @return \PHPUnit\Framework\MockObject\MockObject
     */
    public function createMockResponse($expectedBody,
                                       $expectedStatus = 200,
                                       $expectedContentType = 'json') {
        $stub = $this->createMock(MutedResponse::class);
        if ($expectedStatus == 200) {
            $stub->method('status')
                ->willReturn($stub);
        } else {
            $stub->expects($this->atLeastOnce())
                ->method('status')
                ->with($this->equalTo($expectedStatus))
                ->willReturn($stub);
        }
        $stub->expects($this->once())
            ->method($expectedContentType)
            ->with(is_string($expectedBody)
                ? $this->equalTo($expectedBody)
                : $expectedBody)
            ->willReturn($stub);
        return $stub;
    }
    /**
     * @param \RadCms\Framework\Request $req
     * @param \RadCms\Framework\Response $res
     * @param object $ctx = null
     * @param \Callable $alterInjectorFn = null ($injector: \Auryn\Injector): void
     */
    public function makeRequest($req, $res, $ctx = null, $alterInjectorFn = null) {
        if (!$ctx) {
            $ctx = (object)['db' => null, 'fs' => null];
        }
        if (!isset($ctx->db)) {
            $ctx->db = DbTestCase::getDb();
        }
        if (!isset($ctx->fs)) {
            $ctx->fs = $this->createMock(FileSystemInterface::class);
            $ctx->fs->method('readDir')->willReturn([]); // plugins
        }
        if (!isset($ctx->auth)) {
            $ctx->auth = $this->createMock(Authenticator::class);
            $ctx->auth->method('getIdentity')->willReturn('1');
        }
        $app = CtxExposingApp::create($ctx, 'Tests');
        $injector = new Injector();
        $injector->delegate(Response::class, function() use ($res) { return $res; });
        if ($alterInjectorFn) $alterInjectorFn($injector);
        $app->handleRequest($req, $injector);
        return $app;
    }
}
