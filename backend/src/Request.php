<?php

namespace RadCms;

class Request {
    public $path;
    public $method;
    public $body;
    public $user;
    /**
     * @param string $path
     * @param string $method = 'GET'
     * @param string $body = new \stdClass()
     */
    public function __construct($path, $method = 'GET', $body = null) {
        $this->path = $path;
        $this->method = $method;
        $this->body = $body ?: new \stdClass();
    }

    ////////////////////////////////////////////////////////////////////////////

    /**
     * @param string $BASE_URL
     * @param string $urlPath = str_replace($BASE_URL, '', $_SERVER['REQUEST_URI'])
     * @return \RadCms\Request
     */
    public static function createFromGlobals($BASE_URL, $urlPath = null) {
        $method = $_SERVER['REQUEST_METHOD'];
        if ($method !== 'POST' && $method !== 'PUT') {
            $body = new \stdClass();
        } else {
            if ($_SERVER['CONTENT_TYPE'] !== 'application/json')
                $body = (object) $_POST;
            else {
                if (!($json = file_get_contents('php://input')))
                    $body = new \stdClass();
                else if (($body = json_decode($json)) === null)
                    throw new \RuntimeException('Invalid json input');
            }
        }
        return new Request(
            $urlPath ?: substr($_SERVER['REQUEST_URI'], strlen($BASE_URL) - 1),
            $method,
            $body
        );
    }
}
