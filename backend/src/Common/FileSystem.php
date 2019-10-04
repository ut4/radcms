<?php

namespace RadCms\Common;

class FileSystem implements FileSystemInterface {
    /**
     * @param string $path
     * @param string $content
     * @param int $dirPerms = 0755
     * @return int|false
     */
    public function write($path, $content, $dirPerms = 0755) {
        return file_put_contents($path, $content, LOCK_EX);
    }
    /**
     * @param string $path
     * @param boolean $che = true
     * @return string
     */
    public function read($path) {
        return @file_get_contents($path);
    }
    /**
     * @param string $path
     * @return string|false
     */
    public function unlink($path) {
        return @unlink($path);
    }
    /**
     * @param string $path
     * @param int $perms = 0755
     * @param bool $recursive = true
     * @return bool
     */
    public function mkDir($path, $perms = 0755, $recursive = true) {
        return @mkdir($path, $perms, $recursive);
    }
    /**
     * @param string $path
     * @return bool
     */
    public function isFile($path) {
        return is_file($path);
    }
    /**
     * @param string $path
     * @return bool
     */
    public function isDir($path) {
        return is_dir($path);
    }
}
