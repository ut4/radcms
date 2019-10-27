<?php

namespace RadCms\Tests\_MoviesPlugin;

use RadCms\Plugin\PluginInterface;
use RadCms\Plugin\API;
use RadCms\ContentType\ContentTypeCollection;
use RadCms\ContentType\ContentTypeMigrator;

class _MoviesPlugin implements PluginInterface {
    public function __construct() {
        $this->myContentTypes = new ContentTypeCollection();
        $this->myContentTypes->add('Movies', 'Elokuvat', ['title' => 'text']);
    }
    public function init(API $api) {
        $api->registerRoute('GET', '/movies', MoviesControllers::class,
                            'handleGetMoviesRequest');
        $api->registerRoute('POST', '/movies', MoviesControllers::class,
                            'handleCreateMovieRequest');
    }
    public function install(ContentTypeMigrator $contentTypeMigrator) {
        $contentTypeMigrator->installMany($this->myContentTypes);
    }
    public function uninstall(ContentTypeMigrator $contentTypeMigrator) {
        $contentTypeMigrator->uninstallMany($this->myContentTypes);
    }
    //
    public function getTestContentTypes() {
        return $this->myContentTypes;
    }
}
