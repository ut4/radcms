<?php

declare(strict_types=1);

namespace RadCms;

use Pike\{FileSystem, PikeException};
use Pike\Interfaces\FileSystemInterface;

final class FileMigrator {
    /** @var \Pike\Interfaces\FileSystemInterface */
    private $fs;
    /** @var string */
    private $sourceBase;
    /** @var string */
    private $targetBase;
    /**
     * @param \Pike\Interfaces\FileSystemInterface $fs
     * @param string $sourceBasePath Mistä kopioidaan
     * @param string $targetBasePath Minne kopioidaan
     */
    public function __construct(FileSystemInterface $fs,
                                string $sourceBasePath,
                                string $targetBasePath) {
        $this->fs = $fs;
        $this->sourceBase = FileSystem::normalizePath($sourceBasePath) . '/';
        $this->targetBase = FileSystem::normalizePath($targetBasePath) . '/';
    }
    /**
     * @param array<int, string[]> $relativeFromToDirNamePairs ['fromPathRelativeToSourceBase', 'toPathRelativeToTargetBase'] ...
     * @throws \Pike\PikeException
     */
    public function copyFiles(...$relativeFromToDirNamePairs): void {
        foreach ($relativeFromToDirNamePairs as [$from, $to]) {
            if (!$from || $from === '/')
                throw new PikeException('fromDir mustn\'t be empty',
                                        PikeException::BAD_INPUT);
            ValidationUtils::checkIfValidaPathOrThrow($from);
            ValidationUtils::checkIfValidaPathOrThrow($to);
        }
        //
        foreach ($relativeFromToDirNamePairs as [$from, $to]) {
            $fromPath = $this->sourceBase . FileSystem::normalizePath($from) . '/';
            $toPath = $this->targetBase . (strlen($to) ? (FileSystem::normalizePath($to) . '/') : '');
            // @allow \Pike\PikeException
            $this->createTargetDirIfNotExist($toPath);
            // @allow \Pike\PikeException
            foreach ($this->readDirRelPaths($fromPath, '/.*/') as $relativePath) {
                $from = "{$fromPath}{$relativePath}";
                $to = "{$toPath}{$relativePath}";
                if (!$this->fs->copy($from, $to))
                    throw new PikeException("Failed to copy `{$from}` -> `{$to}`",
                                            PikeException::FAILED_FS_OP);
            }
        }
    }
    /**
     * @param string $fromDir
     * @param string $toDir
     * @return string[]
     */
    public static function fromTo(string $fromDir, string $toDir): array {
        return [$fromDir, $toDir];
    }
    /**
     * @param array<int, string[]> $relativeFromToDirNamePairs ['fromPathRelativeToSourceBase', 'toPathRelativeToTargetBase'] ...
     */
    public function deleteFiles(...$relativeFromToDirNamePairs) {
        throw new \RuntimeException('Not implemented yet');
    }
    /**
     * @param string $path
     * @throws \Pike\PikeException
     */
    private function createTargetDirIfNotExist(string $path): void {
        if (!$this->fs->isDir($path) && !$this->fs->mkDir($path))
            throw new PikeException("Failed to create `{$path}`",
                                    PikeException::FAILED_FS_OP);
    }
    /**
     * @param string $dirPath
     * @param string $filterRegexp
     * @return string[] ['file.php', 'dir/another.php']
     * @throws \Pike\PikeException
     */
    private function readDirRelPaths(string $dirPath, string $filterRegexp): array {
        if (($paths = $this->fs->readDirRecursive($dirPath, $filterRegexp,
            \FilesystemIterator::CURRENT_AS_PATHNAME|\FilesystemIterator::SKIP_DOTS))) {
            return array_map(function ($fullFilePath) use ($dirPath) {
                return substr($fullFilePath, mb_strlen($dirPath));
            }, $paths);
        }
        throw new PikeException("Failed to read `{$dirPath} ({$filterRegexp})`",
                                PikeException::FAILED_FS_OP);
    }
}
