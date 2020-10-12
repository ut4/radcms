<?php

declare(strict_types=1);

namespace RadCms\Tests\_Internal;

use Pike\Request;

abstract class ApiRequestFactory {
    /**
     * @see \Pike\Request::__construct()
     */
    public static function create(string $path,
                                  string $method = 'GET',
                                  object $body = null,
                                  object $files = null,
                                  array $serverVars = null) {
        return new Request($path, $method, $body, $files,
            array_merge(['HTTP_X_REQUESTED_WITH' => 'Loving kindness',
                         'CONTENT_TYPE' => 'application/json'],
                        $serverVars ?? []));
    }
}
