<?php

namespace RadCms\Tests\_MoviesPlugin;

use RadCms\Framework\Response;
use RadCms\Content\DAO;
use RadCms\Content\DMO;
use RadCms\Framework\Request;
use RadCms\ContentType\ContentTypeValidator;
use RadCms\ContentType\ContentTypeCollection;

class MoviesControllers {
    /**
     * @param \RadCms\ContentType\ContentTypeCollection $contentTypes
     */
    public function __construct(ContentTypeCollection $contentTypes) {
        $this->contentType = $contentTypes->find('Movies');
    }
    /**
     * Auryn\Injector injektoi argumentit automaattisesti kutsun yhteydessä
     * (myös konstruktoriin).
     */
    public function handleGetMoviesRequest(Response $res, DAO $dao) {
        $res->json($dao->fetchAll('Movies')->exec());
    }
    /**
     * ...
     */
    public function handleCreateMovieRequest(Request $req,
                                             Response $res,
                                             DMO $dmo) {
        if (($errs = ContentTypeValidator::validateInsertData($this->contentType,
                                                              $req->body))) {
            $res->status(400)->json($errs);
            return;
        }
        $numAffectedRows = $dmo->insert('Movies', (object) [
            'title' => $req->body->title,
        ]);
        $res->json($numAffectedRows > 0
            ? ['my' => 'response']
            : ['my' => 'response']);
    }
}
