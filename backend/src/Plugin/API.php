<?php

namespace RadCms\Plugin;

use AltoRouter;
use RadCms\Templating\MagicTemplate;

/**
 * Lisäosien oma API. Passataan lisäosien (PluginInterface) init-metodiin.
 */
class API {
    private $router;
    private $onJsFileRegistered;
    private $onAdminPanelRegistered;
    /**
     * @param \AltoRouter $ctx
     * @param \Closure $onJsFileRegistered
     * @param \Closure $onAdminPanelRegistered
     */
    public function __construct(AltoRouter $router,
                                $onJsFileRegistered,
                                $onAdminPanelRegistered) {
        $this->router = $router;
        $this->onJsFileRegistered = $onJsFileRegistered;
        $this->onAdminPanelRegistered = $onAdminPanelRegistered;
    }
    /**
     * Rekisteröi <?= $this->DirectiveName(...) ?> käytettäväksi templaatteihin.
     * Esimerkki: registerDirective('MPMovies', RAD_BASE_PATH . 'src/Plugins/MyPlugin/movies.inc');
     *
     * @param string $directiveName
     * @param string $fullFilePath
     * @throws \RadCms\Common\RadException
     */
    public function registerDirective($directiveName, $fullFilePath) {
        // @allow \RadCms\Common\RadException
        MagicTemplate::addAlias($directiveName, $fullFilePath);
    }
    /**
     * Rekisteröi <script src="<?= $scriptFileName ?>"> sisällytettäväksi
     * cpanel.php-tiedostoon. Esimerkki: registerJsFile('MyFile.js', ['type' => 'module']);
     *
     * @param string $scriptFileName
     */
    public function registerJsFile($scriptFileName, array $attrs = []) {
        $this->onJsFileRegistered->__invoke((object)[
            'fileName' => $scriptFileName,
            'attrs' => $attrs
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