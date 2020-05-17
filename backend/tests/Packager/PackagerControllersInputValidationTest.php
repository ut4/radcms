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
        ]);
        $res = $this->createMockResponse(
            ['The length of signingKey must be at least 12',
             'templates.0 is not valid path',
             'assets.0 is not valid path'], 400);
        $this->sendRequest($req, $res, $this->app);
    }


    ////////////////////////////////////////////////////////////////////////////


    public function testPOSTPackagerRejectsNonJsonFileMaps() {
        $req = new Request('/api/packager', 'POST', (object) [
            'signingKey' => str_repeat('-', 32),
            'templates' => new \stdClass,
            'assets' => '["not-valid"%&]',
        ]);
        $res = $this->createMockResponse(
            ['templates must be json',
             'assets must be json'], 400);
        $this->sendRequest($req, $res, $this->app);
    }
}
