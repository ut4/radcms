<?php

declare(strict_types=1);

namespace RadCms\Packager;

use Pike\Auth\Crypto;
use Pike\PikeException;

final class PackageUtils {
    public const MIN_SIGNING_KEY_LEN = 32;
    /** @var \RadCms\Packager\PackageStreamInterface */
    private $package;
    /** @var ?\Pike\Auth\Crypto */
    private $crypto;
    /**
     * @param \RadCms\Packager\PackageStreamInterface $package
     * @param ?\Pike\Auth\Crypto $crypto
     */
    public function __construct(PackageStreamInterface $package,
                                ?Crypto $crypto) {
        $this->package = $package;
        $this->crypto = $crypto;
    }
    /**
     * @param string $localName
     * @param ?string $unlockKey = null
     * @return array
     * @throws \Pike\PikeException
     */
    public function readJsonAsArray(string $localName, ?string $unlockKey = null): array {
        return self::readAndParseJson($localName, $unlockKey);
    }
    /**
     * @param string $localName
     * @param ?string $unlockKey = null
     * @return \stdClass
     * @throws \Pike\PikeException
     */
    public function readJsonAsObject(string $localName, ?string $unlockKey = null): \stdClass {
        return self::readAndParseJson($localName, $unlockKey);
    }
    /**
     * @param string[] $relativeFilePaths
     * @param string $fromDirPath
     * @param string $filesListLocalName
     * @param ?string $filesListSigningKey = null
     * @throws \Pike\PikeException
     */
    public function addFilesAndFilesList(array $relativeFilePaths,
                                         string $fromDirPath,
                                         string $filesListLocalName,
                                         ?string $filesListSigningKey = null): void {
        foreach ($relativeFilePaths as $path)
            // @allow \Pike\PikeException
            $this->package->addFile("{$fromDirPath}{$path}", $path);
        $this->package->addFromString($filesListLocalName, !$filesListSigningKey
            ? json_encode($relativeFilePaths, JSON_UNESCAPED_UNICODE)
            : $this->crypto->encrypt(json_encode($relativeFilePaths, JSON_UNESCAPED_UNICODE),
                                     $filesListSigningKey));
    }
    /**
     * @param string $possiblyLongerKey
     * @return string
     */
    public static function clipSigningKey(string $possiblyLongerKey): string {
        if (strlen($possiblyLongerKey) < Crypto::SECRETBOX_KEYBYTES)
            throw new PikeException('strlen($key) must be at least ' . Crypto::SECRETBOX_KEYBYTES,
                PikeException::BAD_INPUT);
        return substr($possiblyLongerKey, 0, Crypto::SECRETBOX_KEYBYTES);
    }
    /**
     * @param string $localName
     * @param ?string $unlockKey
     * @return array|\stdClass
     * @throws \Pike\PikeException
     */
    private function readAndParseJson(string $localName, ?string $unlockKey) {
        // @allow \Pike\PikeException
        $data = $this->package->read($localName);
        // @allow \Pike\PikeException
        $json = $unlockKey
            ? $this->crypto->decrypt($data, self::clipSigningKey($unlockKey))
            : $data;
        if (($parsed = json_decode($json)) !== null)
            return $parsed;
        throw new PikeException("Failed to parse `{$localName}`",
                                PikeException::BAD_INPUT);
    }
}
