<?php

namespace RadCms\Upload;

use RadCms\Framework\FileSystemInterface;
use RadCms\Common\RadException;

/**
 * Luokka, joka lukee /uploads-kansion sisältöä (ja mahdollisesti cachettaa
 * lukemiaan tietoja jonnekkin).
 */
class UploadFileScanner {
    /** @var \RadCms\Framework\FileSystemInterface */
    private $fs;
    /**
     * @param \RadCms\Framework\FileSystemInterface $fs
     */
    public function __construct(FileSystemInterface $fs) {
        $this->fs = $fs;
    }
    /**
     * @param string $dirPath
     * @return array Array<{fileName: string, basePath: string, mime: string}>
     * @throws \RadCms\Common\RadException
     */
    public function scanAll($dirPath) {
        if (($fullPaths = $this->fs->readDir($dirPath)) === false)
            throw new RadException("Failed to read {$dirPath}", RadException::FAILED_FS_OP);
        if (($finfo = finfo_open(FILEINFO_MIME_TYPE)) === false)
            throw new RadException("finfo_open Failed", RadException::FAILED_FS_OP);
        $out = [];
        foreach ($fullPaths as $p) {
            $basePath = str_replace('\\', '/', dirname($p)) . '/';
            $out[] = (object)['fileName' => str_replace($basePath, '', $p),
                              'basePath' => $basePath,
                              'mime' => finfo_file($finfo, $p)];
        }
        return $out;
    }
}
