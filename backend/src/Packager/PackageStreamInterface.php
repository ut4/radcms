<?php

namespace RadCms\Packager;

use RadCms\Framework\FileSystemInterface;

interface PackageStreamInterface extends FileSystemInterface {
    /**
     * Tulisi heittää epäonnistuessaan \RadCms\Common\RadException.
     *
     * @param string $filePath
     * @param bool $create = false
     */
    public function open($filePath, $create = false);
    /**
     * Tulisi heittää epäonnistuessaan \RadCms\Common\RadException.
     *
     * @return string
     */
    public function getResult();
}
