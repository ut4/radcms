<?php

namespace RadCms\Tests\_Internal;

use RadCms\App;

class CtxExposingApp extends App {
    public function getCtx() {
        return $this->ctx;
    }
    public function getPlugins() {
        return $this->ctx->state->plugins;
    }
}
