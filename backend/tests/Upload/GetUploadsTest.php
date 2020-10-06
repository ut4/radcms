<?php

declare(strict_types=1);

namespace RadCms\Tests\Upload;

use Pike\Request;

final class GetUploadsTest extends UploadControllersTestCase {
    public function testGetUploadsReturnsFilesFromDatabase(): void {
        $state = $this->setupListUploadsTest();
        $this->dbDataHelper->insertData($state->testFiles, 'files');
        $this->sendGetUploadsRequest($state);
        $this->verifyListedTheseFiles($state->testFiles, $state);
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
    private function sendGetUploadsRequest(\stdClass $s, string $filters = null): void {
        $req = new Request('/api/uploads' . (!$filters ? '' : "/{$filters}"), 'GET');
        $s->spyingResponse = $this->makeSpyingResponse();
        $app = $this->makeApp('\RadCms\App::create',
                              $this->getAppConfig(),
                              '\RadCms\AppContext');
        $this->sendRequest($req, $s->spyingResponse, $app);
    }
    private function verifyListedTheseFiles(array $expected, \stdClass $s): void {
        $makeExpectedResponseItem = function ($testItem) { return (object) [
            'fileName' => $testItem->fileName,
            'basePath' => $testItem->basePath,
            'mime' => $testItem->mime,
            'friendlyName' => null,
            'createdAt' => (int) $testItem->createdAt,
            'updatedAt' => (int) $testItem->updatedAt,
        ]; };
        $this->verifyRespondedSuccesfullyWith(
            array_map($makeExpectedResponseItem, $expected),
            $s);
    }


    ////////////////////////////////////////////////////////////////////////////


    public function testGetUploadsReturnsOnlyImages(): void {
        $state = $this->setupListImagesTest();
        $this->dbDataHelper->insertData($state->testFiles, 'files');
        $this->sendGetUploadsRequest($state, json_encode(['mime' => ['$eq' => 'image/*']]));
        $this->verifyListedTheseFiles(array_slice($state->testFiles, 0, 2), $state);
    }
    private function setupListImagesTest(): \stdClass {
        $state = $this->setupListUploadsTest();
        $state->testFiles[] = (object) ['fileName' => 'readme.txt',
                                        'basePath' => '/var/www/html/uploads/',
                                        'mime' => 'text/plain',
                                        'createdAt' => '1320969601',
                                        'updatedAt' => '0'];
        return $state;
    }


    ////////////////////////////////////////////////////////////////////////////


    public function testGetUploadsFiltersFilesByFileNameContaining(): void {
        $state = $this->setupListUploadsTest();
        $this->dbDataHelper->insertData($state->testFiles, 'files');
        $this->sendGetUploadsRequest($state, json_encode(['fileName' => ['$contains' => 'a-ca']]));
        $this->verifyListedTheseFiles(array_slice($state->testFiles, 0, 1), $state);
    }
}
