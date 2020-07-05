<?php

namespace RadPlugins\MoviesPlugin;

use Pike\{ArrayUtils, PikeException, Request, Response};
use RadCms\Common\LoggerAccess;
use RadCms\Content\{DAO, DMO};
use RadCms\ContentType\ContentTypeCollection;

class MoviesControllers {
    /**
     * @param \RadCms\ContentType\ContentTypeCollection $contentTypes
     */
    public function __construct(ContentTypeCollection $contentTypes) {
        $this->contentType = ArrayUtils::findByKey($contentTypes, 'Movies', 'name');
    }
    /**
     * Auryn\Injector injektoi argumentit automaattisesti kutsun yhteydessä
     * (myös konstruktoriin).
     */
    public function handleGetMoviesRequest(Response $res, DAO $dao) {
        $res->json(ArrayUtils::filterByKey($dao->fetchAll('Movies')->exec(),
                                           DAO::STATUS_PUBLISHED,
                                           'status'));
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
                'releaseYear' => $req->body->releaseYear,
            ]);
            $res->json($numAffectedRows > 0
                ? ['my' => 'response']
                : ['my' => 'response']);
        } catch (PikeException $e) {
            LoggerAccess::getLogger()->debug($e->getTraceAsString());
            $res->status($e->getCode() === PikeException::BAD_INPUT ? 400 : 500)
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
            $numAffectedRows = $dmo->update($req->params->movieId, 'Movies',
                                            (object)$req->body);
            $res->json($numAffectedRows > 0
                ? ['my' => 'response2']
                : ['my' => 'response2']);
        } catch (PikeException $e) {
            LoggerAccess::getLogger()->debug($e->getTraceAsString());
            $res->status($e->getCode() === PikeException::BAD_INPUT ? 400 : 500)
                ->json(['err' => 'err']);
        }
    }
    /**
     * ...
     */
    public function handleNoopRequest() { }
}
