<?php

declare(strict_types=1);

namespace RadCms\Tests\Upload;

use Pike\Request;

final class GetUploadsTest extends UploadControllersTestCase {
    public function testGetUploadsReturnsFilesFromDatabase(): void {
        $state = $this->setupListUploadsTest();
        $this->dbDataHelper->insertData($state->testFiles, 'files');
        $this->sendGetUploadsRequest($state);
        $this->verifyListedAllFiles($state);
    }
    private function setupListUploadsTest(): \stdClass {
        $state = new \stdClass;
        $state->spyingResponse = null;
        $state->testFiles = [
            (object) ['fileName' => 'a-cat.png',
                      'basePath' => '/var/www/html/uploads/',
                      'mime' => 'image/png',
                      'createdAt' => '1320969601',
                      'updatedAt' => '0'],
            (object) ['fileName' => 'miller.jpg',
                      'basePath' => '/var/www/html/uploads/',
                      'mime' => 'image/jpeg',
                      'createdAt' => '1320969601',
                      'updatedAt' => '0'],
        ];
        return $state;
    }
    private function sendGetUploadsRequest(\stdClass $s): void {
        $req = new Request('/api/uploads', 'GET');
        $s->spyingResponse = $this->makeSpyingResponse();
        $app = $this->makeApp('\RadCms\App::create',
                              $this->getAppConfig(),
                              '\RadCms\AppContext');
        $this->sendRequest($req, $s->spyingResponse, $app);
    }
    private function verifyListedAllFiles(\stdClass $s): void {
        $makeExpectedResponseItem = function ($testItem) { return (object) [
            'fileName' => $testItem->fileName,
            'basePath' => $testItem->basePath,
            'mime' => $testItem->mime,
            'friendlyName' => null,
            'createdAt' => (int) $testItem->createdAt,
            'updatedAt' => (int) $testItem->updatedAt,
        ]; };
        $this->verifyRespondedSuccesfullyWith([
            $makeExpectedResponseItem($s->testFiles[0]),
            $makeExpectedResponseItem($s->testFiles[1]),
        ], $s);
    }
}
