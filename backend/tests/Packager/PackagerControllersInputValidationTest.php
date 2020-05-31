<?php

namespace RadCms\Tests\Packager;

use Pike\Request;
use Pike\TestUtils\ConfigProvidingTestCase;
use Pike\TestUtils\HttpTestUtils;

final class PackagerControllersInputValidationTest extends ConfigProvidingTestCase {
    use HttpTestUtils;
    private $app;
    protected function setUp(): void {
        parent::setUp();
        $this->app = $this->makeApp('\RadCms\App::create',
                                    $this->getAppConfig(),
                                    '\RadCms\AppContext');
    }
    public function testPOSTPackagerRejectsNonRelativeFilePaths() {
        $req = new Request('/api/packager', 'POST', (object) [
            'signingKey' => '',
            'templates' => json_encode(['../..././foo.php']),
            'assets' => json_encode(['....//bar.css']),
            'uploads' => json_encode(['../file.jpg']),
        ]);
        $res = $this->createMockResponse(
            ['The length of signingKey must be at least 12',
             'templatesParsed.0 is not valid path',
             'assetsParsed.0 is not valid path',
             'uploadsParsed.0 is not valid path'], 400);
        $this->sendRequest($req, $res, $this->app);
    }


    ////////////////////////////////////////////////////////////////////////////


    public function testPOSTPackagerRejectsNonJsonFileLists() {
        $req = new Request('/api/packager', 'POST', (object) [
            'signingKey' => str_repeat('-', 32),
            'templates' => 'not-json',
            'assets' => '["not-valid-json"%&]',
            'uploads' => ['not-even-a-string'],
        ]);
        $res = $this->createMockResponse(
            ['templates must be an array',
             'assets must be an array',
             'uploads must be an array'], 400);
        $this->sendRequest($req, $res, $this->app);
    }
}
