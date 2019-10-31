<?php

namespace RadCms\Tests\Self;

use RadCms\Framework\Response;

class MutedResponse extends Response {
    protected function send($body = '') {}
}
