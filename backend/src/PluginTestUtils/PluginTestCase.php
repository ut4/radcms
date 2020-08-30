<?php declare(strict_types=1);

namespace RadCms\PluginTestUtils;

use Pike\Request;
use Pike\TestUtils\{DbTestCase, HttpTestUtils};
use RadCms\AppContext;
use RadCms\PluginTestUtils\Internal\PluginTestRouter;

class PluginTestCase extends DbTestCase {
    use HttpTestUtils;
    /** @var \Pike\TestUtils\AppHolder */
    private $app;
    /**
     */
    public function setUp(): void {
        parent::setUp();
        $ctx = new AppContext(['db' => '@auto', 'auth' => '@auto']);
        $ctx->router = new PluginTestRouter;
        $this->app = $this->makeApp('\RadCms\App::create',
                                    $this->getAppConfig(),
                                    $ctx);
    }
    /**
     * @param string $layoutFileName plugins/MyPlugin/tests/my-mock-site/$layoutFileName
     * @return string
     */
    protected function renderTemplate(string $layoutFileName): string {
        $req = new Request('/plugin-utils/render-template/' . urlencode($layoutFileName),
                           'PSEUDO');
        $res = $this->makeSpyingResponse();
        $this->sendRequest($req, $res, $this->app);
        return $res->getActualBody();
    }
}
