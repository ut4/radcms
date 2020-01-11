<?php

namespace RadCms\Upload;

use Pike\FileSystemInterface;
use Pike\PikeException;

/**
 * Luokka, joka lukee /uploads-kansion sisältöä (ja mahdollisesti cachettaa
 * lukemiaan tietoja jonnekkin).
 */
class UploadFileScanner {
    /** @var \Pike\FileSystemInterface */
    private $fs;
    /**
     * @param \Pike\FileSystemInterface $fs
     */
    public function __construct(FileSystemInterface $fs) {
        $this->fs = $fs;
    }
    /**
     * @param string $dirPath
     * @return array Array<{fileName: string, basePath: string, mime: string}>
     * @throws \Pike\PikeException
     */
    public function scanAll($dirPath) {
        if (($fullPaths = $this->fs->readDir($dirPath)) === false)
            throw new PikeException("Failed to read {$dirPath}", PikeException::FAILED_FS_OP);
        $out = [];
        foreach ($fullPaths as $p) {
            $basePath = $this->fs->normalizePath(dirname($p));
            $out[] = (object)['fileName' => mb_substr($p, mb_strlen($basePath)),
                              'basePath' => $basePath,
                              'mime' => self::getMime($p)];
        }
        return $out;
    }
    /**
     * @param string $filePath Tiedoston absoluuttinen polku
     * @param string $fallback = '?'
     * @return string
     * @throws \Pike\PikeException
     */
    public static function getMime($filePath, $fallback = '?') {
        static $finfo;
        if (!$finfo && ($finfo = finfo_open(FILEINFO_MIME_TYPE)) === false)
            throw new PikeException('finfo_open() failed', PikeException::FAILED_FS_OP);
        return finfo_file($finfo, $filePath) ?? $fallback;
    }
}
