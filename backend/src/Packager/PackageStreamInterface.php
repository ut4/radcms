<?php

namespace RadCms\Packager;

interface PackageStreamInterface {
    /**
     * @param string $filePath
     * @param bool $create = false
     * @throws \Pike\PikeException
     */
    public function open($filePath, $create = false);
    /**
     * @param string $filePath
     * @param string $localName = null
     * @param int $start = 0
     * @param int $length = 0
     * @return bool
     * @throws \Pike\PikeException
     */
    public function addFile($filePath, $localName = null, $start = 0, $length = 0);
    /**
     * @param string $localName
     * @param string $contents
     * @return bool
     * @throws \Pike\PikeException
     */
    public function addFromString($localName, $contents);
    /**
     * @param string $localName
     * @return string
     * @throws \Pike\PikeException
     */
    public function read($localName);
    /**
     * @param string $destinationPath
     * @param string[]|string $localNames = []
     * @return bool
     * @throws \Pike\PikeException
     */
    public function extractMany($destinationPath, $localNames = []);
    /**
     * @return string
     * @throws \Pike\PikeException
     */
    public function getResult();
}
