<?php

namespace RadCms\Tests\Self;

use RadCms\Framework\Response;

class MutedResponse extends Response {
    public function send($body = '') {}
}
