<?php

namespace RadCms\Tests\Self;

use RadCms\App;

class CtxExposingApp extends App {
    public function getPlugins() {
        return $this->ctx->state->plugins;
    }
}
