<?php

namespace RadCms\Packager;

use Pike\PikeException;
use Pike\FileSystemInterface;

class ZipPackageStream implements PackageStreamInterface {
    /** @var \ZipArchive */
    private $zip;
    /** @var \Pike\FileSystemInterface */
    private $fs;
    /** @var string */
    private $tmpFilePath;
    /**
     * @param \Pike\FileSystemInterface
     */
    public function __construct(FileSystemInterface $fs) {
        $this->fs = $fs;
    }
    /**
     * @param string $filePath
     * @param bool $create = false
     * @throws \Pike\PikeException
     */
    public function open($filePath, $create = false) {
        $this->zip = new \ZipArchive();
        $flags = \ZipArchive::CHECKCONS;
        if ($create) {
            if (!($filePath = tempnam(sys_get_temp_dir(), 'zip')))
                throw new PikeException('Failed to generate temp file name',
                                        PikeException::FAILED_FS_OP);
            $flags = \ZipArchive::OVERWRITE;
        }
        if (($res = $this->zip->open($filePath, $flags)) === true)
            $this->tmpFilePath = $filePath;
        else
            throw new PikeException('Failed to ' . (!$create ? 'open' : 'create') .
                                    ' zip, errcode: ' . $res,
                                    PikeException::FAILED_FS_OP);
    }
    /**
     * @param string $virtualFilePath
     * @param string $contents
     * @throws \Pike\PikeException
     */
    public function write($virtualFilePath, $contents) {
        if (!$this->zip->addFromString($virtualFilePath, $contents))
            throw new PikeException('Failed to write to zip stream',
                                    PikeException::FAILED_FS_OP);
    }
    /**
     * @param string $virtualFilePath
     * @return string
     * @throws \Pike\PikeException
     */
    public function read($virtualFilePath) {
        if (($str = $this->zip->getFromName($virtualFilePath)) !== false)
            return $str;
        throw new PikeException('Failed to read from zip stream',
                                PikeException::FAILED_FS_OP);
    }
    /**
     * @return string
     * @throws \Pike\PikeException
     */
    public function getResult() {
        if (!$this->zip->close())
            throw new PikeException('Failed to close zip stream',
                                    PikeException::FAILED_FS_OP);
        if (!($c = $this->fs->read($this->tmpFilePath)))
            throw new PikeException('Failed to read generated zip',
                                    PikeException::FAILED_FS_OP);
        if (!$this->fs->unlink($this->tmpFilePath))
            throw new PikeException('Failed to remove temp file',
                                    PikeException::FAILED_FS_OP);
        return $c;
    }

    ////////////////////////////////////////////////////////////////////////////

    public function unlink($path) {
        throw new PikeException('Not supported.');
    }
    public function copy($path, $destPath) {
        throw new PikeException('Not supported.');
    }
    public function mkDir($path) {
        throw new PikeException('Not supported.');
    }
    public function rmDir($path) {
        throw new PikeException('Not supported.');
    }
    public function isFile($path) {
        throw new PikeException('Not supported.');
    }
    public function isDir($path) {
        throw new PikeException('Not supported.');
    }
    public function readDir($path) {
        throw new PikeException('Not supported.');
    }
    public function lastModTime($path) {
        throw new PikeException('Not supported.');
    }
}
