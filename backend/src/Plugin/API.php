<?php

namespace RadCms\Plugin;

use AltoRouter;
use RadCms\Templating\MagicTemplate;
use Pike\FileSystem;
use Pike\PikeException;

/**
 * Lisäosien oma API. Passataan lisäosien (PluginInterface) init-metodiin.
 */
class API {
    private $router;
    private $fs;
    private $onJsFileRegistered;
    private $onAdminPanelRegistered;
    /**
     * @param \AltoRouter $ctx
     * @param \Closure $onJsFileRegistered
     * @param \Closure $onAdminPanelRegistered
     */
    public function __construct(AltoRouter $router,
                                FileSystem $fs,
                                $onJsFileRegistered,
                                $onAdminPanelRegistered) {
        $this->router = $router;
        $this->fs = $fs;
        $this->onJsFileRegistered = $onJsFileRegistered;
        $this->onAdminPanelRegistered = $onAdminPanelRegistered;
    }
    /**
     * Rekisteröi <?= $this->DirectiveName(...) ?> käytettäväksi templaatteista.
     * Esimerkki: registerDirective('MPMovies', RAD_SITE_PATH . 'plugins/MyPlugin/movies.inc');
     *
     * @param string $directiveName
     * @param string $fullFilePath
     * @throws \Pike\PikeException
     */
    public function registerDirective($directiveName, $fullFilePath) {
        if (!$this->fs->isFile($fullFilePath))
            throw new PikeException("Failed to locate `{$fullFilePath}`",
                                    PikeException::FAILED_FS_OP);
        // @allow \Pike\PikeException
        MagicTemplate::registerAlias($directiveName, $fullFilePath);
    }
    /**
     * Rekisteröi <?php $this->methodName(...) ?> käytettäväksi templaatteista.

     * @param string $methodName
     * @param \Closure $fn
     * @param bool $bindToDirectiveScope = true
     * @throws \Pike\PikeException
     */
    public function registerDirectiveMethod($methodName, $fn, $bindToDirectiveScope = true) {
        // @allow \Pike\PikeException
        MagicTemplate::registerMethod($methodName, $fn, $bindToDirectiveScope);
    }
    /**
     * Rekisteröi <script src="<?= $scriptFileName ?>"> sisällytettäväksi
     * cpanel.php-tiedostoon. Esimerkki: registerJsFile('MyFile.js', ['type' => 'module']);
     *
     * @param string $scriptFileName
     * @param array $attrs = array
     */
    public function registerJsFile($scriptFileName, array $attrs = []) {
        $this->onJsFileRegistered->__invoke((object)[
            'fileName' => $scriptFileName,
            'attrs' => $attrs,
        ]);
    }
    /**
     * Rekisteröi reitti. Esimerkki: mapRoute(
     *     'GET',
     *     // ks. http://altorouter.com/usage/mapping-routes.html
     *     '/my-plugin/foo/[i:id]/[w:name]',
     *     MyController::class,
     *     'doSomething',
     *     true
     * )
     *
     * @param string $method 'GET', 'POST'
     * @param string $url
     * @param string $ctrlCassPath
     * @param string $ctrlMethodNme
     * @param string $requireAuthenticated = true
     */
    public function registerRoute($method,
                                  $url,
                                  $ctrlCassPath,
                                  $ctrlMethodName,
                                  $requireAuthenticated = true) {
        $this->router->map($method, $url, function () use ($ctrlCassPath,
                                                           $ctrlMethodName,
                                                           $requireAuthenticated) {
            return [$ctrlCassPath, $ctrlMethodName, $requireAuthenticated];
        });
    }
    /**
     * Rekisteröi osion hallintapaneelin Devaajille-välilehteen. $panelImplName sama
     * kuin JS-API:n uiPanelRegister.registerUiPanelImpl(<tämä>, ...). Esimerkki:
     * registerFrontendAdminPanel('MoviesApp', 'ElokuvatApp').
     *
     * @param string $panelImplName
     * @param string $title
     */
    public function registerFrontendAdminPanel($panelImplName, $title) {
        $this->onAdminPanelRegistered->__invoke((object)[
            'impl' => $panelImplName,
            'title' => $title,
        ]);
    }
}