<?php

namespace RadCms\Plugin;

use AltoRouter;
use RadCms\Theme\API as ThemeAPI;

/**
 * Lisäosien oma API. Passataan lisäosien (PluginInterface) init-metodiin.
 */
class API {
    private $router;
    private $themeApi;
    private $onJsFileRegistered;
    private $onAdminPanelRegistered;
    /**
     * @param \AltoRouter $ctx
     * @param \AltoRouter $ctx
     * @param \Closure $onJsFileRegistered
     * @param \Closure $onAdminPanelRegistered
     */
    public function __construct(ThemeAPI $themeApi,
                                AltoRouter $router,
                                $onJsFileRegistered,
                                $onAdminPanelRegistered) {
        $this->router = $router;
        $this->themeApi = $themeApi;
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
        // @allow \Pike\PikeException
        $this->themeApi->registerDirective($directiveName, $fullFilePath);
    }
    /**
     * Rekisteröi <?php $this->methodName(...) ?> käytettäväksi templaatteista.

     * @param string $methodName
     * @param \Closure|callable $fn
     * @param bool $bindToDirectiveScope = false
     * @throws \Pike\PikeException
     */
    public function registerDirectiveMethod($methodName,
                                            callable $fn,
                                            $bindToDirectiveScope = false) {
        // @allow \Pike\PikeException
        $this->themeApi->registerDirectiveMethod($methodName, $fn, $bindToDirectiveScope);
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
        $this->router->map($method, $url,
            [$ctrlCassPath, $ctrlMethodName, $requireAuthenticated]
        );
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