<?php

namespace RadCms\Tests\_Internal;

use RadCms\Framework\Response;

class MutedResponse extends Response {
    protected function send($body = '') {}
}
