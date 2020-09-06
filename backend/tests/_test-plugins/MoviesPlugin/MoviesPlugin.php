<?php

declare(strict_types=1);

namespace RadPlugins\MoviesPlugin;

use RadCms\Auth\ACL;
use RadCms\ContentType\ContentTypeCollection;
use RadCms\Entities\PluginPackData;
use RadCms\Plugin\{MigrationAPI, PluginInterface, PluginAPI};

class MoviesPlugin implements PluginInterface {
    private static $mockPackData;
    public function __construct() {
        $this->myContentTypes = ContentTypeCollection::build()
        ->add('Movies', 'Elokuvat')->description('Kuvaus')
            ->field('title')
            ->field('releaseYear')->dataType('int', 4)
        ->done();
    }
    public function init(PluginAPI $api): void {
        $api->enqueueAdminJsFile('file1.js');
        $api->enqueueAdminJsFile('file2.js', ['id' => 'file2']);
        $api->enqueueFrontendAdminPanel('MoviesAdmin', 'Elokuvat-app');
        //
        $api->registerRoute('GET', '/plugins/movies-plugin', MoviesControllers::class,
                            'handleGetMoviesRequest', ACL::NO_IDENTITY);
        $api->registerRoute('POST', '/plugins/movies-plugin', MoviesControllers::class,
                            'handleCreateMovieRequest', ACL::NO_IDENTITY);
        $api->registerRoute('PUT', '/plugins/movies-plugin/[i:movieId]', MoviesControllers::class,
                            'handleUpdateMovieRequest', ACL::NO_IDENTITY);
        $api->registerRoute('GET', '/plugins/movies-plugin/noop', MoviesControllers::class,
                            'handleNoopRequest', ACL::NO_IDENTITY);
    }
    public function install(MigrationAPI $api, array $initialContent): void {
        $api->installContentTypes($this->myContentTypes, $initialContent);
    }
    public function uninstall(MigrationAPI $api): void {
        $api->uninstallContentTypes($this->myContentTypes);
    }
    public function pack(\RadCms\Content\DAO $dao, PluginPackData $to): void {
        if (!self::$mockPackData)
            return;
        foreach (get_object_vars(self::$mockPackData) as $key => $val)
            $to->{$key} = $val;
    }
    //
    public function getTestContentTypes() {
        return $this->myContentTypes;
    }
    public static function setMockPackData(?PluginPackData $data) {
        self::$mockPackData = $data;
    }
}
