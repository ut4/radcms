<?php

namespace RadCms\Common;

interface FileSystemInterface {
    /**
     * @param string $path
     * @param string $content
     * @return int|false
     */
    public function write($path, $content);
    /**
     * @param string $path
     * @return string|false
     */
    public function read($path);
    /**
     * @param string $path
     * @return bool
     */
    public function unlink($path);
    /**
     * @param string $path
     * @return int|false
     */
    public function mkDir($path);
    /**
     * @param string $path
     * @return bool
     */
    public function isFile($path);
    /**
     * @param string $path
     * @return bool
     */
    public function isDir($path);
}