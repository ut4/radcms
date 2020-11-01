<?php

declare(strict_types=1);

namespace RadCms;
/*

        $mappings
            ->controller(UpdateControllers::class)
            ->consumes('application/json')
            ->produces('application/json') // tehdään kontrollerissa ??
                ->method('getUpdatePackagesFromServer')
                ->mapsTo('GET', '/api/update')
                ->acl('update', 'cms')
                ->method()->requires('') vai ->identifiedBy()
        $ctx->router->map('GET', '/login',
            [AuthControllers::class, 'renderLoginView', ACL::NO_IDENTITY]
        );
        $ctx->router->map('POST', '/api/login',
            [AuthControllers::class, 'handleLoginFormSubmit', ACL::NO_IDENTITY]
        );
        $ctx->router->map('POST', '/api/logout',
            [AuthControllers::class, 'handleLogoutRequest', 'logout:auth']
        );
        $ctx->router->map('GET', '/request-password-reset',
            [AuthControllers::class, 'renderRequestPassResetView', ACL::NO_IDENTITY]
        );
        $ctx->router->map('POST', '/api/request-password-reset',
            [AuthControllers::class, 'handleRequestPassResetFormSubmit',
             ACL::NO_IDENTITY]
        );
        */
class Ctrl {
    private $methods;
    public function consumes(string $ctpye): Ctrl { return $this; }
    public function get(string $path): Ctrl { $this->method = 'GET'; $this->path = $path; return $this; }
    public function post(string $path): Ctrl { $this->method = 'GET'; $this->path = $path; return $this; }
    public function put(string $path): Ctrl { $this->method = 'PUT'; $this->path = $path; return $this; }
    public function delete(string $path): Ctrl { $this->method = 'DELETE'; $this->path = $path; return $this; }
    public function acl(string $ctpye): Ctrl { return $this; }
    public function method(string $ctpye): Ctrl { return $this; }
    public function controller($method): Ctrl { return new Ctrl; }
    public function getMappings(): array { return []; }
    public function apply(\Pike\Router $router): void {
        $router->{$this->method}($this->path);
    }
}
class Foo {
    public function add($method) {}
    public function controller($method): Ctrl { return new Ctrl; }
    public function apply(\Pike\Router $router) {
        foreach ($this->controllers as $ctrl) {
            $base = $ctrl->getUrl;
            foreach ($ctrl->getResult() as $mapping) {
                $router->{$mapping->getMethod()};
            }
        }
    }
    public static function test() {
        (new Foo)
        ->controller('AuthControllers::class')->consumes('json')
            ->get('/login')->method('renderLoginView')
            ->post('/api/login')->method('renderLoginView')
            ->post('/api/logout')->method('renderLoginView')->acl('logout:auth')
            ->get('/request-password-reset')->method('renderLoginView')
            ->post('/api/request-password-reset')->method('renderLoginView')
        ->controller('ContentControllers::class', '/api/content/')->consumes('json')
            ->post('/[w:contentTypeName]/[with-revision:revisionSettings]?')
                ->method('createContentNode')->acl('create:content')
            ->get('/[i:id]/[w:contentTypeName]')
                ->method('getContentNode')->acl('view:content')
            ->get('/[w:contentTypeName]/[*:filters]?')
                ->method('getContentNodesByType')->acl('view:content')
            ->put('/[i:id]/[w:contentTypeName]/[publish|unpublish:revisionSettings]?')
                ->method('updateContentNode')->acl('update:content')
            ->delete('/[i:id]/[w:contentTypeName]')
                ->method('deleteContentNode')->acl('delete:content')
        ;
    }
}

final class AppContext extends \Pike\AppContext {
    /** \RadCms\CmsState */
    public $cmsState;
    /** \Pike\Translator */
    public $translator;
    /** @var Foo */
    public $foo;
}
