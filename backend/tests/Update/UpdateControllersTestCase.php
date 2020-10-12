<?php

declare(strict_types=1);

namespace RadCms\Tests\Update;

use PHPUnit\Framework\MockObject\MockObject;
use Pike\Interfaces\FileSystemInterface;
use Pike\TestUtils\{ConfigProvidingTestCase, HttpTestUtils};

abstract class UpdateControllersTestCase extends ConfigProvidingTestCase {
    use HttpTestUtils;
    /**
     * @param \stdClass $state
     * @return \PHPUnit\Framework\MockObject\MockObject
     */
    protected function makeFsThatReturnsSingleUpdateFile(\stdClass $state): MockObject {
        return $this->makeFsThat('returnsSingleUpdateFile', $state);
    }
    /**
     * @return \PHPUnit\Framework\MockObject\MockObject
     */
    protected function makeFsThat(...$what): MockObject {
        $l = func_num_args();
        $state = func_get_arg($l - 1);
        $out = $this->createMock(FileSystemInterface::class);
        foreach ($what as $behaviour) {
        if ($behaviour === $state)
            break;
        switch ($behaviour) {
        case 'returnsSingleUpdateFile':
            $out->method('readDir')
                ->willReturn([RAD_BACKEND_PATH . $state->mockUpdateFileNames[0]]);
            break;
        case 'returnsContentsOfBackedSourceDir':
            $out->method('readDirRecursive')
                ->with(RAD_BACKEND_PATH . 'src/', '/^.*\.php$/', $this->anything())
                ->willReturn([RAD_BACKEND_PATH. 'src/Api/QueryFilters.php',
                              RAD_BACKEND_PATH. 'src/Auth/ACL.php']); // jne..
            break;
        default:
            throw new \UnexpectedValueException();
        }
        }
        return $out;
    }
}
