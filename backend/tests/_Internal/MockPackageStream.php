<?php

namespace RadCms\Tests\_Internal;

use RadCms\Packager\PackageStreamInterface;

class MockPackageStream implements PackageStreamInterface {
    private $virtualFiles;
    public function __construct(\stdClass $virtualFiles = null) {
        $this->virtualFiles = $virtualFiles;
    }
    public function open($filePath, $create = false) {
        if (!$create)
            $this->virtualFiles = json_decode(substr($filePath, strlen('json://')));
        else
            $this->virtualFiles = new \stdClass;
    }
    public function addFile($filePath, $localName = null, $start = 0, $length = 0) {
        $this->addFromString($localName ?? $filePath, self::mockReadFile($filePath));
    }
    public static function mockReadFile($filePath) {
        return "(file) {$filePath}";
    }
    public function addFromString($localName, $contents) {
        $this->virtualFiles->$localName = $contents;
    }
    public function read($localName) {
        return $this->virtualFiles->$localName;
    }
    public function extractMany($destinationPath, $localNames = []) {
        // ...
    }
    public function getResult() {
        return json_encode($this->virtualFiles);
    }
    public function getVirtualFiles() {
        return $this->virtualFiles;
    }
}
