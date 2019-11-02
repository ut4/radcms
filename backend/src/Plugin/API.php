<?php

namespace RadCms\Plugin;

use AltoRouter;
use RadCms\Templating\MagicTemplate;

/**
 * Lisäosien oma API. Passataan lisäosien (PluginInterface) init-metodiin.
 */
class API {
    private $router;
    private $jsFiles;
    /**
     * @param \AltoRouter $ctx
     * @param array &$jsFilesOut
     */
    public function __construct(AltoRouter $router, &$jsFilesOut) {
        $this->router = $router;
        $this->jsFiles =& $jsFilesOut;
    }
    /**
     * Rekisteröi <?= $this->DirectiveName(...) ?> käytettäväksi templaatteihin.
     * Esim. registerDirective('MPMovies', RAD_BASE_PATH . 'src/Plugins/MyPlugin/movies.inc');
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
     * cpanel.php-tiedostoon. Saa sisältää vain /^[a-zA-Z0-9_.]+\.js$/. Esim.
     * registerJsFile('MyFile.js');
     *
     * @param string $scriptFileName
     */
    public function registerJsFile($scriptFileName) {
        $this->jsFiles[] = $scriptFileName;
    }
    /**
     * Rekisteröi reitti. Esim. mapRoute('GET',
     *                                    // ks. http://altorouter.com/usage/mapping-routes.html
     *                                    '/my-plugin/foo/[i:id]/[w:name]',
     *                                    MyController::class,
     *                                    'doSomething',
     *                                    true)
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
}