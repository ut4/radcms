<?php

declare(strict_types=1);

namespace RadCms\Tests\Update;

use Pike\FileSystem;
use Pike\TestUtils\MockCrypto;
use RadCms\Tests\_Internal\ApiRequestFactory;

final class GetUpdatePackagesTest extends UpdateControllersTestCase {
    public function testGetUpdatePackagesFromServerReturnsPackageFilesFromDisk(): void {
        $state = $this->setupGetPackagesTest();
        $this->sendGetUpdatePackagesFromServerRequest($state);
        $this->verifyReturnedPackageFilesFoundFromDisk($state);
    }
    private function setupGetPackagesTest(): \stdClass {
        $state = new \stdClass;
        $state->mockUpdateFileNames = [MockCrypto::mockGenRandomToken(32) . '.update'];
        $state->spyingResponse = null;
        return $state;
    }
    private function sendGetUpdatePackagesFromServerRequest(\stdClass $s): void {
        $req = ApiRequestFactory::create('/api/updates', 'GET');
        $app = $this->makeApp('\RadCms\App::create', $this->getAppConfig(),
            '\RadCms\AppContext', function ($injector) use ($s) {
                $injector->delegate(FileSystem::class, function () use ($s) {
                    return $this->makeFsThatReturnsSingleUpdateFile($s);
                });
            });
        $s->spyingResponse = $this->makeSpyingResponse();
        $this->sendRequest($req, $s->spyingResponse, $app);
    }
    private function verifyReturnedPackageFilesFoundFromDisk(\stdClass $s): void {
        $this->verifyResponseMetaEquals(200, 'application/json', $s->spyingResponse);
        $this->verifyResponseBodyEquals($s->mockUpdateFileNames, $s->spyingResponse);
    }
}
