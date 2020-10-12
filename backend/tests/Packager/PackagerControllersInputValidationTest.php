<?php

namespace RadCms\Tests\Packager;

use Pike\TestUtils\{ConfigProvidingTestCase, HttpTestUtils};
use RadCms\Packager\PackageUtils;
use RadCms\Tests\_Internal\ApiRequestFactory;

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
        $req = ApiRequestFactory::create('/api/packager', 'POST', (object) [
            'signingKey' => '',
            'templates' => ['../..././foo.php'],
            'assets' => ['....//bar.css'],
            'uploads' => ['../file.jpg'],
            'plugins' => ['Not v$l!d'],
        ]);
        $spyingResponse = $this->makeSpyingResponse();
        $this->sendRequest($req, $spyingResponse, $this->app);
        $this->verifyResponseMetaEquals(400, 'application/json', $spyingResponse);
        $this->verifyResponseBodyEquals(
            ['The length of signingKey must be at least ' . PackageUtils::MIN_SIGNING_KEY_LEN,
             'templates.0 is not valid path',
             'assets.0 is not valid path',
             'uploads.0 is not valid path',
             'plugins.0 must contain only [a-zA-Z0-9_] and start with [a-zA-Z_]'],
            $spyingResponse);
    }
}
