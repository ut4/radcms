<?php

declare(strict_types=1);

namespace RadCms\Cli\Tests;

use PHPUnit\Framework\TestCase;
use Pike\Auth\Crypto;
use Pike\{FileSystem, Request};
use Pike\TestUtils\{HttpTestUtils, MockCrypto};
use RadCms\AppContext;
use RadCms\Cli\UpdatePackageGenerator;
use RadCms\Packager\ZipPackageStream;

final class GenerateUpdatePackageTest extends TestCase {
    use HttpTestUtils;
    /** @var \Pike\FileSystem */
    private $fs;
    /** @var string */
    private $testInputFileName = 'my-update.json';
    protected function setUp(): void {
        parent::setUp();
        $this->fs = new FileSystem;
    }
    protected function tearDown(): void {
        parent::tearDown();
        foreach ([RAD_WORKSPACE_PATH . $this->testInputFileName,
                  RAD_WORKSPACE_PATH . MockCrypto::mockGenRandomToken(32) . '.update'] as $path)
            if ($this->fs->isFile($path))
                $this->fs->unlink($path);
    }
    public function testGenerateIncludesInputBackendFilesToPackage() {
        $state = $this->setupCreatePackageTest();
        $this->writeTestInputFileToDisk($state);
        $this->invokeGenerateUpdatePackageFeature($state);
        $this->verifyWroteUpdatePackageFileToDisk($state);
        $this->verifyIncludedBackendFilesToUpdatePackage($state);
        $this->verifyIncludedBackendFilesListToUpdatePackage($state);
    }
    private function setupCreatePackageTest(): \stdClass {
        $state = new \stdClass;
        $state->spyingResponse = null;
        $state->testInput = (object) [
            'backendFilesList' => [
                'src/Api/QueryFilters.php'
            ],
        ];
        $state->testSigningKey = '12345678901234567890123456789012';
        $state->actuallyGeneratedPackage = null;
        return $state;
    }
    private function writeTestInputFileToDisk(\stdClass $s): void {
        $this->fs->write(RAD_WORKSPACE_PATH . $this->testInputFileName,
            json_encode($s->testInput));
    }
    private function invokeGenerateUpdatePackageFeature(\stdClass $s): void {
        $ctx = new AppContext();
        $app = $this->makeApp('\RadCms\Cli\App::create', [], $ctx,
            function ($injector) {
                $injector->delegate(Crypto::class, function () {
                    return new MockCrypto;
                });
            });
        $spyingResponse = $this->makeSpyingResponse();
        $this->sendRequest(new Request("/make-update-package" .
                                       "/{$this->testInputFileName}" .
                                       "/{$s->testSigningKey}", 'PSEUDO'), $spyingResponse, $app);
    }
    private function verifyWroteUpdatePackageFileToDisk(\stdClass $s): void {
        $expectedOutputFileName = MockCrypto::mockGenRandomToken(32) . '.update';
        $this->assertFileExists(RAD_WORKSPACE_PATH . $expectedOutputFileName);
    }
    private function verifyIncludedBackendFilesToUpdatePackage(\stdClass $s): void {
        $actual = new ZipPackageStream($this->fs);
        $actual->open(RAD_WORKSPACE_PATH . MockCrypto::mockGenRandomToken(32) . '.update');
        $contentFromPackage = $actual->read($s->testInput->backendFilesList[0]);
        $this->assertEquals($this->fs->read(RAD_BACKEND_PATH . $s->testInput->backendFilesList[0]),
                            $contentFromPackage);
        $s->actuallyGeneratedPackage = $actual;
    }
    private function verifyIncludedBackendFilesListToUpdatePackage(\stdClass $s): void {
        $encrypted = $s->actuallyGeneratedPackage->read(UpdatePackageGenerator::LOCAL_NAMES_BACKEND_FILES_LIST);
        $decrypted = MockCrypto::mockDecrypt($encrypted, $s->testSigningKey);
        $filesList = json_decode($decrypted);
        $this->assertEquals($s->testInput->backendFilesList, $filesList);
    }
}
