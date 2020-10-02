<?php

declare(strict_types=1);

namespace RadCms\Tests\Upload;

use Pike\TestUtils\{DbTestCase, HttpTestUtils};
use RadCms\Tests\_Internal\DbDataHelper;
use RadCms\Upload\UploadsRepository;

abstract class UploadControllersTestCase extends DbTestCase {
    use HttpTestUtils;
    /** @var \RadCms\Tests\_Internal\DbDataHelper */
    protected $dbDataHelper;
    /***/
    public function setUp(): void {
        parent::setUp();
        $this->dbDataHelper = new DbDataHelper(self::$db);
    }
    /***/
    public function tearDown(): void {
        parent::tearDown();
        (new UploadsRepository(self::$db))->deleteAll();
    }
    /**
     * @param array|object $expected
     * @param \stdClass $state
     */
    protected function verifyRespondedSuccesfullyWith($expected, \stdClass $state): void {
        $this->verifyResponseMetaEquals(200, 'application/json', $state->spyingResponse);
        $this->verifyResponseBodyEquals($expected, $state->spyingResponse);
    }
}
