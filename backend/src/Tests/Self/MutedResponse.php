<?php

namespace RadCms\Tests\Self;

use RadCms\Response;

class MutedResponse extends Response {
    public function send($body = '') {}
}
