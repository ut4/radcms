<?php

namespace MySite\Plugins\MoviesPlugin;

use RadCms\Framework\Response;
use RadCms\Content\DAO;
use RadCms\Content\DMO;
use RadCms\Framework\Request;
use RadCms\ContentType\ContentTypeCollection;
use RadCms\Common\RadException;
use RadCms\Common\LoggerAccess;

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
        try {
            $numAffectedRows = $dmo->insert('Movies', (object) [
                'title' => $req->body->title,
            ]);
            $res->json($numAffectedRows > 0
                ? ['my' => 'response']
                : ['my' => 'response']);
        } catch (RadException $e) {
            LoggerAccess::getLogger()->debug($e->getTraceAsString());
            $res->status($e->getCode() == RadException::BAD_INPUT ? 400 : 500)
                ->json(['err' => 'err']);
        }
    }
    /**
     * ...
     */
    public function handleUpdateMovieRequest(Request $req,
                                             Response $res,
                                             DMO $dmo) {
        try {
            $numAffectedRows = $dmo->update($req->params->movieId, 'Movies', (object) [
                'title' => $req->body->title,
            ]);
            $res->json($numAffectedRows > 0
                ? ['my' => 'response2']
                : ['my' => 'response2']);
        } catch (RadException $e) {
            LoggerAccess::getLogger()->debug($e->getTraceAsString());
            $res->status($e->getCode() == RadException::BAD_INPUT ? 400 : 500)
                ->json(['err' => 'err']);
        }
    }
    /**
     * ...
     */
    public function handleNoopRequest() { }
}
