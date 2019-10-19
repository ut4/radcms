<?php

namespace RadCms\Tests\Self;

use RadCms\RadCmsApp;
use Auryn\Injector;
use RadCms\Framework\Response;

trait HttpTestUtils {
    /**
     * @param string $expectedBody
     * @param string $expectedStatus = 200
     * @param string $expectedContentType = null
     * @return \PHPUnit\Framework\MockObject\MockObject
     */
    public function createMockResponse($expectedBody,
                                       $expectedStatus = 200,
                                       $expectedContentType = null) {
        $stub = $this->createMock(MutedResponse::class);
        if ($expectedStatus == 200) {
            $stub->method('status')->willReturn($stub);
        } else {
            $stub->expects($this->atLeastOnce())
                ->method('status')
                ->with($this->equalTo($expectedStatus))
                ->willReturn($stub);
        }
        $stub->expects($this->once())
            ->method('send')
            ->with(is_string($expectedBody)
                ? $this->equalTo($expectedBody)
                : $expectedBody)
            ->willReturn($stub);
        if ($expectedContentType) {
            $stub->expects($this->atLeastOnce())
                ->method('type')
                ->with($expectedContentType)
                ->willReturn($stub);
        }
        return $stub;
    }
    /**
     * @param \RadCms\Framework\Request $req
     * @param \RadCms\Framework\Response $res
     * @param \RadCms\Framework\FileSystemInterface $mockFs
     * @param \Closure $makeDb = [get_class(), 'getDb']
     */
    public function makeRequest($req, $res, $mockFs, $makeDb = null) {
        $config = include RAD_SITE_PATH . 'config.php';
        $app = RadCmsApp::create($config, 'Tests', $mockFs,
                                 $makeDb ?? [get_class(), 'getDb']);
        $injector = new Injector;
        $injector->delegate(Response::class, function() use ($res) { return $res; });
        $app->handleRequest($req, $injector);
    }
}
