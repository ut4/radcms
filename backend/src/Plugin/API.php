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
     */
    public function registerDirective($directiveName, $fullFilePath) {
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
     *                                    'doSomething')
     *
     * @param string $method 'GET', 'POST'
     * @param string $url
     * @param string $ctrlCassPath
     * @param string $ctrlMethodNme
     */
    public function registerRoute($method, $url, $ctrlCassPath, $ctrlMethodName) {
        $this->router->map($method, $url, function () use ($ctrlCassPath, $ctrlMethodName) {
            return [$ctrlCassPath, $ctrlMethodName];
        });
    }
}