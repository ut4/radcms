<?php

namespace MySite\Plugins\MoviesPlugin;

use RadCms\Plugin\PluginInterface;
use RadCms\Plugin\API;
use RadCms\ContentType\ContentTypeCollection;
use RadCms\ContentType\ContentTypeMigrator;

class MoviesPlugin implements PluginInterface {
    private $initialDataToInstall;
    public function __construct() {
        $this->myContentTypes = new ContentTypeCollection();
        $this->myContentTypes->add('Movies', 'Elokuvat', ['title' => 'text']);
    }
    public function init(API $api) {
        $api->registerJsFile('file1.js');
        $api->registerJsFile('file2.js', ['id' => 'file2']);
        $api->registerFrontendAdminPanel('MoviesAdmin', 'Elokuvat-app');
        //
        $api->registerRoute('GET', '/movies', MoviesControllers::class,
                            'handleGetMoviesRequest', false);
        $api->registerRoute('POST', '/movies', MoviesControllers::class,
                            'handleCreateMovieRequest', false);
        $api->registerRoute('PUT', '/movies/[i:movieId]', MoviesControllers::class,
                            'handleUpdateMovieRequest', false);
        $api->registerRoute('GET', '/noop', MoviesControllers::class,
                            'handleNoopRequest', false);
    }
    public function install(ContentTypeMigrator $contentTypeMigrator) {
        $contentTypeMigrator->installMany($this->myContentTypes,
                                          $this->initialDataToInstall);
    }
    public function uninstall(ContentTypeMigrator $contentTypeMigrator) {
        $contentTypeMigrator->uninstallMany($this->myContentTypes);
    }
    //
    public function setTestInitalData($dataToInstall) {
        $this->initialDataToInstall = $dataToInstall;
    }
    public function getTestContentTypes() {
        return $this->myContentTypes;
    }
}
