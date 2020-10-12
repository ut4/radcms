<?php

declare(strict_types=1);

namespace RadCms\Tests\Update;

use PHPUnit\Framework\MockObject\MockObject;
use Pike\{FileSystem, PikeException};
use Pike\Auth\Crypto;
use Pike\TestUtils\MockCrypto;
use RadCms\Packager\{PackageUtils, ZipPackageStream};
use RadCms\Tests\_Internal\{ApiRequestFactory, MockPackageStream};
use RadCms\Update\{Backupper, UpdateInstaller};

final class UpdateCmsTest extends UpdateControllersTestCase {
    private const TEST_SIGNING_KEY = '00000000000000000000000000000000';
    public function testUpdateCmsRejectsInvalidInput(): void {
        $state = $this->setupInputValidationTest();
        $this->sendUpdateCmsRequest2($state, new MockPackageStream);
        $this->verifyResponseMetaEquals(400, 'application/json', $state->spyingResponse);
        $this->verifyResponseBodyEquals([
            'The length of unlockKey must be at least ' . PackageUtils::MIN_SIGNING_KEY_LEN
        ], $state->spyingResponse);
    }
    private function setupInputValidationTest(): \stdClass {
        $state = new \stdClass;
        $state->mockUpdateFileNames = [MockCrypto::mockGenRandomToken(32) . '.update'];
        $state->reqBody = (object) ['signingKey' => ['not-a-string']];
        $state->spyingResponse = null;
        return $state;
    }


    ////////////////////////////////////////////////////////////////////////////


    public function testUpdateCmsThrowsIfPackageSecretAndTargetSiteSecretDoNotMatch(): void {
        $state = $this->setupSecretValidationTest();
        $this->expectException(PikeException::class);
        $this->expectExceptionCode(PikeException::BAD_INPUT);
        $this->expectExceptionMessage('Failed to verify package secret');
        $this->sendUpdateCmsRequest2($state, $this->makePackageThat('hasDifferentSecret'));
    }
    private function setupSecretValidationTest(): \stdClass {
        $state = $this->setupInputValidationTest();
        $state->reqBody = (object) ['unlockKey' => self::TEST_SIGNING_KEY];
        return $state;
    }
    private function makePackageThat(...$what): MockObject {
        foreach ($what as $behaviour) {
        switch ($behaviour) {
        case 'hasDifferentSecret';
            $out = $this->createMock(ZipPackageStream::class);
            $out->method('read')->with(UpdateInstaller::LOCAL_NAMES_SITE_SECRET_HASH)
                ->willReturn('some-other-site\'s-sercret');
            return $out;
        default:
            throw new \UnexpectedValueException();
        }
        }
    }
    private function sendUpdateCmsRequest2(\stdClass $s, $package, $mockFs = null): void {
        $req = ApiRequestFactory::create('/api/updates', 'PUT', $s->reqBody);
        $app = $this->makeApp('\RadCms\App::create', $this->getAppConfig(),
            '\RadCms\AppContext', function ($injector) use ($s, $mockFs, $package) {
                $injector->delegate(Crypto::class, function () {
                    return new MockCrypto;
                });
                $injector->delegate(ZipPackageStream::class, function () use ($package) {
                    return $package;
                });
                $injector->delegate(FileSystem::class, function () use ($mockFs, $s) {
                    return $mockFs ?? $this->makeFsThatReturnsSingleUpdateFile($s);
                });
                $injector->delegate(Backupper::class, function () use ($s) {
                    return $this->makeSpyingBackupper($s);
                });
            });
        $s->spyingResponse = $this->makeSpyingResponse();
        $this->sendRequest($req, $s->spyingResponse, $app);
    }


    ////////////////////////////////////////////////////////////////////////////


    public function testUpdateCmsRejectsIfUnlockKeyIsNotCorrect(): void {
        $state = $this->setupIncorrectUnlockKeyTest();
        $this->sendUpdateCmsRequest2($state, $this->makeTestPackage());
        $this->verifyResponseMetaEquals(200, 'application/json', $state->spyingResponse);
        $this->verifyResponseBodyEquals([
            'knownError' => 'invalidUnlockKey',
        ], $state->spyingResponse);
    }
    private function setupIncorrectUnlockKeyTest(): \stdClass {
        $state = $this->setupInputValidationTest();
        $state->reqBody = (object) [
            'unlockKey' => str_repeat('1', strlen(self::TEST_SIGNING_KEY))
        ];
        return $state;
    }
    private function makeTestPackage(array $backendFileNames = []): MockPackageStream {
        $out = new MockPackageStream();
        $out->addFromString(UpdateInstaller::LOCAL_NAMES_SITE_SECRET_HASH,
                            MockCrypto::mockHashPass(RAD_SECRET));
        $out->addFromString(UpdateInstaller::LOCAL_NAMES_BACKEND_FILES_LIST,
                            MockCrypto::mockEncrypt(json_encode($backendFileNames),
                                                    self::TEST_SIGNING_KEY));
        foreach ($backendFileNames as $fileName)
            $out->addFile($fileName, "Contents of: {$fileName}");
        return $out;
    }


    ////////////////////////////////////////////////////////////////////////////


    public function testUpdateCmsWritesBackendSourceFilesFromUpdatePackage(): void {
        $state = $this->setupBackendFilesWriteTest();
        $this->sendUpdateCmsRequest2(
            $state,
            $state->testPackage,
            $this->makeFsThat(
                'returnsSingleUpdateFile',
                'returnsContentsOfBackedSourceDir',
                $state));
        $this->verifyResponseMetaEquals(200, 'application/json', $state->spyingResponse);
        $this->verifyResponseBodyEquals(['ok' => 'ok'], $state->spyingResponse);
        $this->verifyExtractedBackedSourceFilesFromThePackageToDisk($state);
        $this->verifyBackuppedBackendSourceFiles($state);
    }
    private function setupBackendFilesWriteTest(): \stdClass {
        $state = $this->setupInputValidationTest();
        $state->reqBody = (object) ['unlockKey' => self::TEST_SIGNING_KEY];
        $state->testPackageBackendFileNames = ['src/Auth/ACL.php', 'src/App.php'];
        $state->testPackage = $this->makeTestPackage($state->testPackageBackendFileNames);
        $state->backupperCalls = [];
        return $state;
    }
    private function makeSpyingBackupper(\stdClass $s): MockObject {
        $out = $this->createMock(Backupper::class);
        $out->method('createBackup')
            ->with($this->callback(function ($fileNames) use ($s) {
                $s->backupperCalls[] = [$fileNames];
                return true;
            }), $this->callback(function ($dir) use ($s) {
                $s->backupperCalls[count($s->backupperCalls) - 1][] = $dir;
                return true;
            }));
        return $out;
    }
    private function verifyExtractedBackedSourceFilesFromThePackageToDisk(\stdClass $s): void {
        $this->assertCount(1, $s->testPackage->actuallyExtracted);
        [$toDirPath, $fileNames] = $s->testPackage->actuallyExtracted[0];
        $this->assertEquals(RAD_BACKEND_PATH, $toDirPath);
        $this->assertEquals($s->testPackageBackendFileNames, $fileNames);
    }
    private function verifyBackuppedBackendSourceFiles(\stdClass $s): void {
        $this->assertCount(1, $s->backupperCalls);
        [$fileNames, $dirPath] = $s->backupperCalls[0];
        $this->assertEquals('Api/QueryFilters.php', $fileNames[0]);
        $this->assertEquals(RAD_BACKEND_PATH . 'src/', $dirPath);
    }
}
