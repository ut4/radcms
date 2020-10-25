<?php

declare(strict_types=1);

namespace RadCms\Upload;

use Pike\{FileSystem, PikeException};
use RadCms\Entities\UploadsEntry;
use RadCms\ValidationUtils;

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
     * @param ?string $targetFileName Kohdetiedoston nimi
     * @param int $maxSize Tiedoston koko maksimissaan, tavua
     * @return \RadCms\Entities\UploadsEntry
     * @throws \Pike\PikeException
     */
    public function upload(array $file,
                           string $toDir,
                           ?string $targetFileName = null,
                           int $maxSize = self::DEFAULT_MAX_SIZE_B): UploadsEntry {
        if (($file['size'] ?? -1) < 0 ||
            !strlen($file['tmp_name'] ?? '') ||
            preg_match('/\/|\.\./', $file['name'] ?? '/')) // mitä tahansa paitsi "/" tai ".."
            throw new PikeException('Invalid file', PikeException::BAD_INPUT);
        //
        if ($file['size'] > $maxSize)
            throw new PikeException("Uploaded file larger than allowed {$maxSize}B",
                                    PikeException::BAD_INPUT);
        if ($targetFileName)
            ValidationUtils::checkIfValidaPathOrThrow($targetFileName, true);
        // @allow \Pike\PikeException
        $mime = UploadFileScanner::getMime($file['tmp_name'], '?');
        if (!UploadFileScanner::isImage($mime))
            throw new PikeException("`{$mime}` is not valid mime",
                                    PikeException::BAD_INPUT);
        //
        $out = new UploadsEntry;
        $out->fileName = $targetFileName ?: $file['name'];
        $out->basePath = FileSystem::normalizePath($toDir) . '/';
        if (call_user_func($this->moveUploadedFileFn,
                           $file['tmp_name'],
                           "{$out->basePath}{$out->fileName}")) {
            $out->mime = $mime;
            return $out;
        }
        throw new PikeException('Failed to move_uploaded_file()',
                                PikeException::FAILED_FS_OP);
    }
}
