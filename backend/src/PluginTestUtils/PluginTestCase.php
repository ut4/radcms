<?php declare(strict_types=1);

namespace RadCms\PluginTestUtils;

use Pike\Request;
use Pike\TestUtils\{AppHolder, DbTestCase, HttpTestUtils};
use RadCms\AppContext;
use RadCms\PluginTestUtils\Internal\PluginTestRouter;

class PluginTestCase extends DbTestCase {
    use HttpTestUtils;
    /** @var \Pike\TestUtils\AppHolder */
    protected $app;
    /**
     * @param ?callable $alterInjector fn(\Auryn\Injector $injector): void
     * @return \Pike\TestUtils\AppHolder
     */
    public function makePluginTestApp(?callable $alterInjector = null): AppHolder {
        $ctx = new AppContext(['db' => '@auto', 'auth' => '@auto']);
        $ctx->router = new PluginTestRouter;
        return $this->makeApp('\RadCms\App::create',
                              $this->getAppConfig(),
                              $ctx,
                              $alterInjector);
    }
    /**
     * $app = $this->makePluginTestApp();
     * $output = $this->renderTemplate('foo.tmpl.php', $app);
     *
     * @param string $layoutFileName plugins/MyPlugin/tests/my-mock-site/$layoutFileName
     * @param \Pike\TestUtils\AppHolder $app
     * @return string
     */
    protected function renderTemplate(string $layoutFileName, AppHolder $app): string {
        $req = new Request('/plugin-utils/render-template/' . urlencode($layoutFileName),
                           'PSEUDO');
        $res = $this->makeSpyingResponse();
        $this->sendRequest($req, $res, $app);
        return $res->getActualBody();
    }
    /**
     * @return object {name: string, lang: string}
     */
    protected function getSiteInfo(): object {
        return (object) self::$db->fetchOne('SELECT `name`,`lang` FROM `${p}cmsState`',
                                            [],
                                            \PDO::FETCH_ASSOC);
    }
}
