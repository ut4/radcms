<?php

namespace RadCms;

use RadCms\Request;
use RadCms\Response;

class Router {
    private $matchers = [];
    /**
     * @param callable $fn
     */
    public function addMatcher($fn) {
        array_push($this->matchers, $fn);
    }
    /**
     * @param Request $req
     * @param Request $res = null
     */
    public function dispatch(Request $req, Response $res = null) {
        $handler = null;
        foreach ($this->matchers as $matcher) {
            $handler = $matcher($req->path, $req->method);
            if ($handler) break;
        }
        if ($handler) {
            if (!$res) $res = new Response();
            $handler($req, $res);
        }
        else throw new \RuntimeException("No route for {$req->path}"); 
    }
}
