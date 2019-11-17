<?php

namespace RadCms\Packager;

interface PackageStreamInterface {
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
     * @param string $virtualFilePath
     * @param string $contents
     */
    public function write($virtualFilePath, $contents);
    /**
     * Tulisi heittää epäonnistuessaan \RadCms\Common\RadException.
     *
     * @param string $virtualFilePath
     * @return string
     */
    public function read($virtualFilePath);
    /**
     * Tulisi heittää epäonnistuessaan \RadCms\Common\RadException.
     *
     * @return string
     */
    public function getResult();
}
