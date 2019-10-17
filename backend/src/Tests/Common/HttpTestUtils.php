<?php

namespace RadCms\Tests\Common;

use RadCms\Response;

trait HttpTestUtils {
    /**
     * @param string $expectedBody
     * @param string $expectedStatus = 200
     * @return \PHPUnit\Framework\MockObject\MockObject
     */
    public function createMockResponse($expectedBody, $expectedStatus = 200) {
        $stub = $this->createMock(Response::class);
        $stub->expects($this->once())
            ->method('status')
            ->with($this->equalTo($expectedStatus))
            ->willReturn($stub);
        $stub->expects($this->once())
            ->method('send')
            ->with(is_string($expectedBody)
                ? $this->equalTo($expectedBody)
                : $expectedBody)
            ->willReturn($stub);
        return $stub;
    }
}
