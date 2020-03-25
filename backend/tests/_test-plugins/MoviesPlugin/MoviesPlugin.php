<?php

namespace RadPlugins\MoviesPlugin;

use RadCms\Plugin\PluginInterface;
use RadCms\Plugin\API;
use RadCms\ContentType\ContentTypeCollection;
use RadCms\ContentType\ContentTypeMigrator;
use RadCms\Auth\ACL;

class MoviesPlugin implements PluginInterface {
    private $initialDataToInstall;
    public function __construct() {
        $this->myContentTypes = new ContentTypeCollection();
        $this->myContentTypes->add('Movies', 'Elokuvat', [
            (object) ['name' => 'title', 'dataType' => 'text'],
            (object) ['name' => 'releaseYear', 'dataType' => 'int'],
        ]);
    }
    public function init(API $api) {
        $api->registerJsFile('file1.js');
        $api->registerJsFile('file2.js', ['id' => 'file2']);
        $api->registerFrontendAdminPanel('MoviesAdmin', 'Elokuvat-app');
        //
        $api->registerRoute('GET', '/movies', MoviesControllers::class,
                            'handleGetMoviesRequest', ACL::NO_NAME);
        $api->registerRoute('POST', '/movies', MoviesControllers::class,
                            'handleCreateMovieRequest', ACL::NO_NAME);
        $api->registerRoute('PUT', '/movies/[i:movieId]', MoviesControllers::class,
                            'handleUpdateMovieRequest', ACL::NO_NAME);
        $api->registerRoute('GET', '/noop', MoviesControllers::class,
                            'handleNoopRequest', ACL::NO_NAME);
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
