<?php

declare(strict_types=1);

namespace RadCms\Packager;

interface PackageStreamInterface {
    /**
     * @param string $filePath
     * @param bool $create = false
     * @throws \Pike\PikeException
     */
    public function open(string $filePath, bool $create = false): void;
    /**
     * @param string $filePath
     * @param string $localName = null
     * @param int $start = 0
     * @param int $length = 0
     * @return bool
     * @throws \Pike\PikeException
     */
    public function addFile(string $filePath,
                            string $localName = null,
                            int $start = 0,
                            int $length = 0): bool;
    /**
     * @param string $localName
     * @param string $contents
     * @return bool
     * @throws \Pike\PikeException
     */
    public function addFromString(string $localName, string $contents): bool;
    /**
     * @param string $localName
     * @return string
     * @throws \Pike\PikeException
     */
    public function read(string $localName): string;
    /**
     * @param string $destinationPath
     * @param string[]|string $localNames = []
     * @return bool
     * @throws \Pike\PikeException
     */
    public function extractMany(string $destinationPath,
                                $localNames = []): bool;
    /**
     * @return string
     * @throws \Pike\PikeException
     */
    public function getResult(): string;
}
