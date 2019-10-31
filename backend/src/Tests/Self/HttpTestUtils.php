<?php

namespace RadCms\Tests\Self;

use RadCms\App;
use Auryn\Injector;
use RadCms\Framework\Response;
use RadCms\Framework\FileSystemInterface;

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
     * @param \RadCms\Framework\FileSystemInterface|\RadCms\App $mockFsOrApp = null
     * @param \Callable $alterInjectorFn = null ($injector: \Auryn\Injector): void
     */
    public function makeRequest($req, $res, $mockFsOrApp = null, $alterInjectorFn = null) {
        if (!($mockFsOrApp instanceof App)) {
            $db = DbTestCase::getDb();
            if (!$mockFsOrApp) {
                $mockFsOrApp = $this->createMock(FileSystemInterface::class);
                $mockFsOrApp->method('readDir')->willReturn([]); // plugins
            }
            $app = App::create($db, $mockFsOrApp, 'Tests');
        } else {
            $app = $mockFsOrApp;
        }
        $injector = new Injector();
        $injector->delegate(Response::class, function() use ($res) { return $res; });
        if ($alterInjectorFn) $alterInjectorFn($injector);
        $app->handleRequest($req, $injector);
    }
}
