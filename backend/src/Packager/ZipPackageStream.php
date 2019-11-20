<?php

namespace RadCms\Packager;

use RadCms\Common\RadException;
use RadCms\Framework\FileSystemInterface;

class ZipPackageStream implements PackageStreamInterface {
    /** @var \ZipArchive */
    private $zip;
    /** @var \RadCms\Framework\FileSystemInterface */
    private $fs;
    /** @var string */
    private $tmpFilePath;
    /**
     * @param \RadCms\Framework\FileSystemInterface
     */
    public function __construct(FileSystemInterface $fs) {
        $this->fs = $fs;
    }
    /**
     * @param string $filePath
     * @param bool $create = false
     * @throws \RadCms\Common\RadException
     */
    public function open($filePath, $create = false) {
        $this->zip = new \ZipArchive();
        $flags = \ZipArchive::CHECKCONS;
        if ($create) {
            if (!($filePath = tempnam(sys_get_temp_dir(), 'zip')))
                throw new RadException('Failed to generate temp file name',
                                       RadException::FAILED_FS_OP);
            $flags = \ZipArchive::OVERWRITE;
        }
        if (($res = $this->zip->open($filePath, $flags)) === true)
            $this->tmpFilePath = $filePath;
        else
            throw new RadException('Failed to ' . (!$create ? 'open' : 'create') .
                                   ' zip, errcode: ' . $res,
                                   RadException::FAILED_FS_OP);
    }
    /**
     * @param string $virtualFilePath
     * @param string $contents
     * @throws \RadCms\Common\RadException
     */
    public function write($virtualFilePath, $contents) {
        if (!$this->zip->addFromString($virtualFilePath, $contents))
            throw new RadException('Failed to write to zip stream',
                                   RadException::FAILED_FS_OP);
    }
    /**
     * @param string $virtualFilePath
     * @return string
     * @throws \RadCms\Common\RadException
     */
    public function read($virtualFilePath) {
        if (($str = $this->zip->getFromName($virtualFilePath)) !== false)
            return $str;
        throw new RadException('Failed to read from zip stream',
                               RadException::FAILED_FS_OP);
    }
    /**
     * @return string
     * @throws \RadCms\Common\RadException
     */
    public function getResult() {
        if (!$this->zip->close())
            throw new RadException('Failed to close zip stream',
                                   RadException::FAILED_FS_OP);
        if (!($c = $this->fs->read($this->tmpFilePath)))
            throw new RadException('Failed to read generated zip',
                                   RadException::FAILED_FS_OP);
        if (!$this->fs->unlink($this->tmpFilePath))
            throw new RadException('Failed to remove temp file',
                                   RadException::FAILED_FS_OP);
        return $c;
    }
}
