<?php

declare(strict_types=1);

namespace RadCms\Update;

use Pike\Auth\Crypto;
use Pike\Interfaces\FileSystemInterface;
use Pike\PikeException;
use RadCms\FileMigrator;
use RadCms\Packager\{PackageStreamInterface, PackageUtils};

class UpdateInstaller {
    public const LOCAL_NAMES_SITE_SECRET_HASH = 'hashed-site-secret';
    public const LOCAL_NAMES_BACKEND_FILES_LIST = 'backend-files-list.json';
    /** @var \RadCms\Packager\PackageStreamInterface */
    private $package;
    /** @var \Pike\Interfaces\FileSystemInterface */
    private $fs;
    /** @var \RadCms\Update\Backupper */
    private $backupper;
    /** @var \Pike\Auth\Crypto */
    private $crypto;
    /**
     * @param \RadCms\Packager\PackageStreamInterface $package
     * @param \Pike\Interfaces\FileSystemInterface $fs
     * @param \RadCms\Update\Backupper $backupper
     * @param \Pike\Auth\Crypto $crypto
     */
    public function __construct(PackageStreamInterface $package,
                                FileSystemInterface $fs,
                                Backupper $backupper,
                                Crypto $crypto) {
        $this->package = $package;
        $this->fs = $fs;
        $this->backupper = $backupper;
        $this->crypto = $crypto;
    }
    /**
     * @param string $packageFilePath
     * @param string $unlockKey
     */
    public function applyUpdate(string $packageFilePath, string $unlockKey): void {
        // @allow \Pike\PikeException
        $this->package->open($packageFilePath);
        $hashedSecret = $this->package->read(self::LOCAL_NAMES_SITE_SECRET_HASH);
        if (!$this->crypto->verifyPass(RAD_SECRET, $hashedSecret))
            throw new PikeException('Failed to verify package secret',
                                    PikeException::BAD_INPUT);
        $packageUtils = new PackageUtils($this->package, $this->crypto);
        // @allow \Pike\PikeException
        $filesList = $packageUtils->readJsonAsArray(
            self::LOCAL_NAMES_BACKEND_FILES_LIST, $unlockKey);
        // @allow \Pike\PikeException
        $backup = $this->backupBackendSourceFiles();
        try {
            $this->package->extractMany(RAD_BACKEND_PATH, $filesList);
        } catch (\Exception $_e) {
            // @allow \Pike\PikeException
            $this->backupper->restore($backup);
        }
        // @allow \Pike\PikeException
        $this->backupper->cleanUp($backup);
    }
    /**
     * @throws \Pike\PikeException
     */
    private function backupBackendSourceFiles(): string {
        $srcDirPath = RAD_BACKEND_PATH . 'src/';
        // @allow \Pike\PikeException
        $paths = $this->fs->readDirRecursive($srcDirPath, '/^.*\.php$/',
            \FilesystemIterator::CURRENT_AS_PATHNAME|\FilesystemIterator::SKIP_DOTS);
        $local = array_map(FileMigrator::makeRelatifier($srcDirPath), $paths);
        //
        return $this->backupper->createBackup($local, $srcDirPath);
    }
}
