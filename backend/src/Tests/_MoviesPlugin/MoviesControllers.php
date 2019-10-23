<?php

namespace RadCms\Tests\_MoviesPlugin;

use RadCms\Framework\Response;
use RadCms\Content\DAO;

class MoviesControllers {
    /**
     * Auryn\Injector injektoi argumentit automaattisesti kutsun yhteydessä
     * (myös konstruktoriin).
     */
    public function handleGetMoviesRequest(Response $res, DAO $dao) {
        $res->json($dao->fetchAll('Movies')->exec());
    }
}
