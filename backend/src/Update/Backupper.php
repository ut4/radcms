<?php

declare(strict_types=1);

namespace RadCms\Update;

use Pike\Interfaces\FileSystemInterface;
use Pike\PikeException;
use RadCms\Packager\{PackageUtils, ZipPackageStream};

class Backupper {
    /** @var array<string, string> tmpFilePath => dirPathWeAreBackupping */
    private $handles;
    /** @var \Pike\Interfaces\FileSystemInterface */
    private $fs;
    /**
     * @param \Pike\Interfaces\FileSystemInterface $fs
     */
    public function __construct(FileSystemInterface $fs) {
        $this->handles = [];
        $this->fs = $fs;
    }
    /**
     * @param string[] $fileNames e.g. ['file.php', 'dir/another.php']
     * @param string $dirPath e.g. '/var/www/app/src/'
     * @return string $backupHandle
     */
    public function createBackup(array $fileNames, string $dirPath): string {
        $zip = new ZipPackageStream($this->fs);
        // @allow \Pike\PikeException
        $tmpBackupFilePath = $zip->open('@createTemp', true);
        foreach ($fileNames as $localName)
            // @allow \Pike\PikeException
            $zip->addFile("{$dirPath}{$localName}", $localName);
        // @allow \Pike\PikeException
        $zip->addFromString('backup-file-list.json',
            json_encode($fileNames, JSON_UNESCAPED_UNICODE));
        // @allow \Pike\PikeException
        $zip->writeToDisk();
        $this->handles[$tmpBackupFilePath] = $dirPath;
        return $tmpBackupFilePath;
    }
    /**
     * @param string $handle
     */
    public function restore(string $handle): void {
        $handleDirPath = $this->handles[$handle] ?? null;
        if (!$handleDirPath)
            throw new PikeException("Backup {$handle} not found. Was it returned by createBackup()?",
                                    PikeException::BAD_INPUT);
        $zip = new ZipPackageStream($this->fs);
        // @allow \Pike\PikeException
        $zip->open($handle);
        $utils = new PackageUtils($zip, null);
        // @allow \Pike\PikeException
        $fileList = $utils->readJsonAsArray('backup-file-list.json', null);
        // @allow \Pike\PikeException
        $zip->extractMany($handleDirPath, $fileList);
    }
    /**
     * @param string $handle
     */
    public function cleanUp(string $handle): void {
        if (!array_key_exists($handle, $this->handles))
            throw new PikeException("Backup {$handle} not found. Was it returned by createBackup()?",
                                    PikeException::BAD_INPUT);
        $this->fs->unlink($handle);
    }
}
