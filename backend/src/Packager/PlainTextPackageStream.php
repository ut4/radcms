<?php

namespace RadCms\Packager;

use RadCms\Common\RadException;

class PlainTextPackageStream implements PackageStreamInterface {
    private $virtualFiles;
    /**
     * @param string[] $virtualFiles = []
     */
    public function __construct(array $virtualFiles = []) {
        $this->virtualFiles = $virtualFiles;
    }
    /**
     * @param string $json
     * @param bool $create = false
     */
    public function open($json, $create = false) {
        if ($json && ($this->virtualFiles = json_decode($json, true)) === null)
            throw new RadException('Invalid package', RadException::BAD_INPUT);
    }
    /**
     * @param string $virtualFilePath
     * @param string $contents
     */
    public function write($virtualFilePath, $contents) {
        $this->virtualFiles[$virtualFilePath] = $contents;
    }
    /**
     * @param string $virtualFilePath
     * @return string
     */
    public function read($virtualFilePath) {
        return $this->virtualFiles[$virtualFilePath] ?? '';
    }
    /**
     * @return string
     */
    public function getResult() {
        return json_encode($this->virtualFiles, JSON_UNESCAPED_UNICODE);
    }
}
