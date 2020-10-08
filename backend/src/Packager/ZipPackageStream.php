<?php

declare(strict_types=1);

namespace RadCms\Packager;

use Pike\PikeException;
use Pike\Interfaces\FileSystemInterface;
use RadCms\ValidationUtils;

class ZipPackageStream implements PackageStreamInterface {
    /** @var \ZipArchive */
    private $zip;
    /** @var \Pike\Interfaces\FileSystemInterface */
    private $fs;
    /** @var string */
    private $tmpFilePath;
    /** @var string */
    private $inputFilePath;
    /**
     * @param \Pike\Interfaces\FileSystemInterface
     */
    public function __construct(FileSystemInterface $fs) {
        $this->fs = $fs;
    }
    /**
     * @param string $filePath
     * @param bool $create = false
     * @throws \Pike\PikeException
     */
    public function open(string $filePath, bool $create = false): void {
        $this->zip = new \ZipArchive();
        $flags = \ZipArchive::CHECKCONS;
        if ($create) {
            if ($filePath) {
                ValidationUtils::checkIfValidaPathOrThrow($filePath);
                $this->inputFilePath = $filePath;
            }
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
                            int $length = 0): bool {
        if ($this->zip->addFile($filePath, $localName, $start, $length))
            return true;
        throw new PikeException("Failed to read `{$filePath}` to zip stream",
                                PikeException::FAILED_FS_OP);
    }
    /**
     * @param string $localName
     * @param string $contents
     * @return bool
     * @throws \Pike\PikeException
     */
    public function addFromString(string $localName, string $contents): bool {
        if ($this->zip->addFromString($localName, $contents))
            return true;
        throw new PikeException("Failed to add `{$localName}` to zip stream",
                                PikeException::FAILED_FS_OP);
    }
    /**
     * @param string $localName
     * @return string
     * @throws \Pike\PikeException
     */
    public function read(string $localName): string {
        if (($str = $this->zip->getFromName($localName)) !== false)
            return $str;
        throw new PikeException("Failed to read `{$localName}` zip stream",
                                PikeException::FAILED_FS_OP);
    }
    /**
     * @param string $destinationPath
     * @param string[]|string $localNames = []
     * @return bool
     * @throws \Pike\PikeException
     */
    public function extractMany(string $destinationPath,
                                $localNames = []): bool {
        if ($this->zip->extractTo($destinationPath, $localNames))
            return true;
        throw new PikeException("Failed to extract entries to ${destinationPath}",
                                PikeException::FAILED_FS_OP);
    }
    /**
     * @return string
     * @throws \Pike\PikeException
     */
    public function getResult(): string {
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
    /**
     * @throws \Pike\PikeException
     */
    public function writeToDisk(): void {
        if (!$this->zip->close())
            throw new PikeException('Failed to close zip stream',
                                    PikeException::FAILED_FS_OP);
        if ($this->inputFilePath) {
            if (!$this->fs->move($this->tmpFilePath, $this->inputFilePath))
            throw new PikeException('Failed to move zip stream output file',
                                    PikeException::FAILED_FS_OP);
        }
    }
}
