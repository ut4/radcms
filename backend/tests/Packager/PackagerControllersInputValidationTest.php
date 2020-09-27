<?php

namespace RadCms\Tests\Packager;

use Pike\Request;
use Pike\TestUtils\{ConfigProvidingTestCase, HttpTestUtils};
use RadCms\Packager\Packager;

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
            'templates' => ['../..././foo.php'],
            'assets' => ['....//bar.css'],
            'uploads' => ['../file.jpg'],
            'plugins' => ['Not v$l!d'],
        ]);
        $res = $this->createMockResponse(
            ['The length of signingKey must be at least ' . Packager::MIN_SIGNING_KEY_LEN,
             'templates.0 is not valid path',
             'assets.0 is not valid path',
             'uploads.0 is not valid path',
             'plugins.0 must contain only [a-zA-Z0-9_] and start with [a-zA-Z_]'], 400);
        $this->sendRequest($req, $res, $this->app);
    }
}
