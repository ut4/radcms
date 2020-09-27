<?php

declare(strict_types=1);

namespace RadCms\Upload;

use Pike\FileSystem;
use Pike\PikeException;

/**
 * Luokka, joka vastaa käyttäjän lataamien tiedostojen validoinnista, ja siirtä-
 * misestä kohdekansioon.
 */
class Uploader {
    public const DEFAULT_MAX_SIZE_MB = 8;
    public const DEFAULT_MAX_SIZE_B = 1024 * 1024 * 8;
    /** @var callable */
    private $moveUploadedFileFn;
    /**
     * @param callable $moveUploadedFileFn = 'move_uploaded_file'
     */
    public function __construct(callable $moveUploadedFileFn = null) {
        $this->moveUploadedFileFn = $moveUploadedFileFn ?? '\move_uploaded_file';
    }
    /**
     * @param array<string, mixed> $file ['size' => int, 'tmp_name' => string, 'name' => string]
     * @param string $toDir Absoluuttinen polku kohdekansioon, tulisi olla olemassa
     * @param int $maxSize Tiedoston koko maksimissaan, tavua
     * @return \stdClass {fileName: string, basePath: string, mime: string}
     * @throws \Pike\PikeException
     */
    public function upload(array $file,
                           string $toDir,
                           int $maxSize = self::DEFAULT_MAX_SIZE_B): \stdClass {
        if (($file['size'] ?? -1) < 0 ||
            !strlen($file['tmp_name'] ?? '') ||
            preg_match('/\/|\.\./', $file['name'] ?? '/')) // mitä tahansa paitsi "/" tai ".."
            throw new PikeException('Invalid file', PikeException::BAD_INPUT);
        //
        if ($file['size'] > $maxSize)
            throw new PikeException("Uploaded file larger than allowed {$maxSize}B",
                                    PikeException::BAD_INPUT);
        // @allow \Pike\PikeException
        $mime = UploadFileScanner::getMime($file['tmp_name'], '?');
        if (!$this->isValidMime($mime))
            throw new PikeException("`{$mime}` is not valid mime",
                                    PikeException::BAD_INPUT);
        //
        $toDirPath = FileSystem::normalizePath($toDir) . '/';
        if (call_user_func($this->moveUploadedFileFn,
                           $file['tmp_name'],
                           "{$toDirPath}{$file['name']}"))
            return (object) ['fileName' => $file['name'],
                             'basePath' => $toDirPath,
                             'mime' => $mime];
        throw new PikeException('Failed to move_uploaded_file()',
                                PikeException::FAILED_FS_OP);
    }
    /**
     * @param string $mime 'image/jpg' etc.
     * @return bool
     */
    public function isValidMime(string $mime): bool {
        return substr($mime, 0, strlen('image/')) === 'image/';
    }
}
