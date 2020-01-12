<?php

namespace RadCms\Packager;

use Pike\FileSystemInterface;

interface PackageStreamInterface extends FileSystemInterface {
    /**
     * Tulisi heittää epäonnistuessaan \Pike\PikeException.
     *
     * @param string $filePath
     * @param bool $create = false
     */
    public function open($filePath, $create = false);
    /**
     * Tulisi heittää epäonnistuessaan \Pike\PikeException.
     *
     * @return string
     */
    public function getResult();
}
