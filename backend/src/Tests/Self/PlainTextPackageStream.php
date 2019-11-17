<?php

namespace RadCms\Tests\Self;

use RadCms\Packager\PackageStreamInterface;

class PlainTextPackageStream implements PackageStreamInterface {
    private $virtualFiles;
    public function __construct(array $virtualFiles = []) {
        $this->virtualFiles = $virtualFiles;
    }
    public function open($contents, $create = false) {
        $this->virtualFiles = json_decode($contents);
    }
    public function write($virtualFilePath, $contents) {
        $this->virtualFiles[$virtualFilePath] = $contents;
    }
    public function read($virtualFilePath) {
        return $this->virtualFiles[$virtualFilePath];
    }
    public function getResult() {
        return json_encode($this->virtualFiles);
    }
}
