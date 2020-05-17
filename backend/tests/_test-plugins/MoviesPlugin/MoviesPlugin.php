<?php

namespace RadPlugins\MoviesPlugin;

use RadCms\Plugin\PluginInterface;
use RadCms\Plugin\PluginAPI;
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
    public function init(PluginAPI $api): void {
        $api->enqueueAdminJsFile('file1.js');
        $api->enqueueAdminJsFile('file2.js', ['id' => 'file2']);
        $api->enqueueFrontendAdminPanel('MoviesAdmin', 'Elokuvat-app');
        //
        $api->registerRoute('GET', '/movies', MoviesControllers::class,
                            'handleGetMoviesRequest', ACL::NO_IDENTITY);
        $api->registerRoute('POST', '/movies', MoviesControllers::class,
                            'handleCreateMovieRequest', ACL::NO_IDENTITY);
        $api->registerRoute('PUT', '/movies/[i:movieId]', MoviesControllers::class,
                            'handleUpdateMovieRequest', ACL::NO_IDENTITY);
        $api->registerRoute('GET', '/noop', MoviesControllers::class,
                            'handleNoopRequest', ACL::NO_IDENTITY);
    }
    public function install(ContentTypeMigrator $contentTypeMigrator): void {
        $contentTypeMigrator->installMany($this->myContentTypes,
                                          $this->initialDataToInstall);
    }
    public function uninstall(ContentTypeMigrator $contentTypeMigrator): void {
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
