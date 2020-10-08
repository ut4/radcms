<?php

namespace RadCms\Tests\_Internal;

use RadCms\Packager\PackageStreamInterface;

class MockPackageStream implements PackageStreamInterface {
    private $virtualFiles;
    public function __construct(\stdClass $virtualFiles = null) {
        $this->virtualFiles = $virtualFiles;
    }
    public function open(string $filePath, bool $create = false): void {
        if (!$create)
            $this->virtualFiles = json_decode(substr($filePath, strlen('json://')));
        else
            $this->virtualFiles = new \stdClass;
    }
    public function addFile(string $filePath,
                            string $localName = null,
                            int $start = 0,
                            int $length = 0): bool {
        return $this->addFromString($localName ?? $filePath, self::mockReadFile($filePath));
    }
    public static function mockReadFile($filePath) {
        return "(file) {$filePath}";
    }
    public function addFromString(string $localName, string $contents): bool {
        $this->virtualFiles->$localName = $contents;
        return true;
    }
    public function read(string $localName): string {
        return $this->virtualFiles->$localName;
    }
    public function extractMany(string $destinationPath,
                                $localNames = []): bool {
        return true;
    }
    public function getResult(): string {
        return json_encode($this->virtualFiles);
    }
    public function getVirtualFiles(): \stdClass {
        return $this->virtualFiles;
    }
    public function writeToDisk(): void {
        throw new \RuntimeException('Not supported');
    }
}
