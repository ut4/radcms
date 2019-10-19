<?php

namespace RadCms\Tests\Self;

use RadCms\RadCms;
use Auryn\Injector;
use RadCms\Response;

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
     * @param \RadCms\Request $req
     * @param \RadCms\Response $res
     * @param \RadCms\Common\FileSystemInterface $mockFs
     * @param \callable $makeDb = [get_class(), 'getDb']
     */
    public function makeRequest($req, $res, $mockFs, $makeDb = null) {
        include RAD_SITE_PATH . 'config.php';
        $app = RadCms::create($config, 'Tests', $mockFs, $makeDb ?: [get_class(), 'getDb']);
        $injector = new Injector;
        $injector->delegate(Response::class, function() use ($res) { return $res; });
        $app->handleRequest($req, $injector);
    }
}
