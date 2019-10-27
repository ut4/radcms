<?php

namespace RadCms\Framework;

class Response {
    public $contentType;
    public $statusCode;
    /**
     * @param string $contentType = 'html'
     * @param integer $statusCode = 200
     */
    public function __construct($contentType = 'html', $statusCode = 200) {
        $this->type($contentType);
        $this->status($statusCode);
    }
    /**
     * @param array|object|string $data
     */
    public function json($data) {
        $this->type('json')->send($data);
    }
    /**
     * @param string $type 'html' | 'json'
     * @return Response
     */
    public function type($type) {
        $this->contentType = [
            'html' => 'text/html',
            'json' => 'application/json',
        ][$type];
        return $this;
    }
    /**
     * @param integer $statusCode
     * @return Response
     */
    public function status($statusCode) {
        $this->statusCode = $statusCode;
        return $this;
    }
    /**
     * @param string|array|object $body = ''
     */
    public function send($body = '') {
        http_response_code($this->statusCode);
        header('Content-Type: ' .  $this->contentType);
        echo is_string($body) ? $body : json_encode($body);
    }
    /**
     * @param string $to
     * @param bool $isPermanent = true
     */
    public function redirect($to, $isPermanent = true) {
        header('Location: ' . $to, true, $isPermanent ? 301 : 302);
    }
}
