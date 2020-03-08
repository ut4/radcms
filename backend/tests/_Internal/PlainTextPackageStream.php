<?php

namespace RadCms\Tests\_Internal;

use RadCms\Packager\PackageStreamInterface;

class PlainTextPackageStream implements PackageStreamInterface {
    private $virtualFiles;
    public function __construct(array $virtualFiles = []) {
        $this->virtualFiles = $virtualFiles;
    }
    public function open($filePath, $create = false) {
        // ...
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
