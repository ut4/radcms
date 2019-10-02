<?php

namespace RadCms;

class Request {
    public $path;
    public $method;
    public $user;
    /**
     * @param string $path
     */
    public function __construct($path) {
        $this->path = $path;
        $this->method = $_SERVER['REQUEST_METHOD'];
    }
}
