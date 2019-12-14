<?php

namespace RadCms\Tests\_Internal;

use Pike\Response;

class MutedResponse extends Response {
    protected function send($body = '') {}
}
