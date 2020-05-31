<?php

declare(strict_types=1);

namespace RadCms\Installer;

use Pike\Db;
use Pike\PikeException;
use Pike\Auth\Crypto;
use Pike\FileSystemInterface;
use RadCms\ContentType\ContentTypeCollection;
use RadCms\ContentType\ContentTypeMigrator;
use RadCms\Packager\Packager;
use RadCms\Packager\PackageStreamInterface;

/**
 * Asentaa sivuston pakettitiedostosta.
 */
class PackageInstaller {
    private $db;
    private $fs;
    private $crypto;
    private $commons;
    private $package;
    /**
     * @param \Pike\Db $db
     * @param \Pike\FileSystemInterface $fs
     * @param \Pike\Auth\Crypto $crypto
     * @param \RadCms\Installer\InstallerCommons $commons
     * @param \RadCms\Packager\PackageStreamInterface $package
     */
    public function __construct(Db $db,
                                FileSystemInterface $fs,
                                Crypto $crypto,
                                InstallerCommons $commons,
                                PackageStreamInterface $package) {
        $this->db = $db;
        $this->fs = $fs;
        $this->crypto = $crypto;
        $this->commons = $commons;
        $this->package = $package;
    }
    /**
     * @param string $packageFilePath '/path/to/htdocs/packed.radsite'
     * @param \stdClass $input {unlockKey: string, baseUrl: string}
     * @return \stdClass|null
     * @throws \Pike\PikeException
     */
    public function doInstall(string $packageFilePath, \stdClass $input): ?\stdClass {
        // @allow \Pike\PikeException
        $this->package->open($packageFilePath);
        // @allow \Pike\PikeException
        $mainData = $this->readMainData($input->unlockKey);
        $settings = $mainData->settings;
        $settings->baseUrl = $input->baseUrl;
        // @allow \Pike\PikeException
        $ok = $this->commons->createOrOpenDb($settings) &&
               $this->commons->createMainSchema($settings) &&
               $this->commons->insertMainSchemaData($settings) &&
               $this->commons->createUserZero($settings, $mainData->user) &&
               $this->createContentTypesAndInsertData($mainData->contentTypes,
                                                      $mainData->content) &&
               $this->writeFiles() &&
               $this->commons->generateConfigFile($settings) &&
               $this->commons->selfDestruct() &&
               $this->selfDestruct($packageFilePath);
        return $ok ? $settings : null;
    }
    /**
     * @return string[]
     */
    public function getWarnings(): array {
        return $this->commons->getWarnings();
    }
    /**
     * @param string $unlockKey
     * @return \stdClass
     * @throws \Pike\PikeException
     */
    private function readMainData(string $unlockKey): \stdClass {
        // @allow \Pike\PikeException
        $encodedJson = $this->package->read(Packager::LOCAL_NAMES_MAIN_DATA);
        // @allow \Pike\PikeException
        $decodedJson = $this->crypto->decrypt($encodedJson, $unlockKey);
        if (($parsed = json_decode($decodedJson)) !== null)
            return $parsed;
        throw new PikeException('Failed to parse `' . Packager::LOCAL_NAMES_MAIN_DATA . '`',
                                PikeException::BAD_INPUT);
    }
    /**
     * @param array $compactCTypes
     * @param array $data
     * @return bool
     * @throws \Pike\PikeException
     */
    private function createContentTypesAndInsertData(array $compactCTypes,
                                                     array $data): bool {
        $collection = ContentTypeCollection::fromCompactForm($compactCTypes);
        // @allow \Pike\PikeException
        return (new ContentTypeMigrator($this->db))->installMany($collection,
                                                                 $data);
    }
    /**
     * @return bool
     * @throws \Pike\PikeException
     */
    private function writeFiles(): bool {
        // @allow \Pike\PikeException
        $this->commons->createSiteDirectories();
        $siteDirPath = $this->commons->getSiteDirPath();
        //
        foreach ([
            [Packager::LOCAL_NAMES_PHP_FILES_FILE_LIST, 'site'],
            [Packager::LOCAL_NAMES_ASSETS_FILE_LIST, 'site'],
            [Packager::LOCAL_NAMES_UPLOADS_FILE_LIST, 'uploads'],
        ] as [$fileListLocalName, $targetDirName]) {
            // @allow \Pike\PikeException
            $json = $this->package->read($fileListLocalName);
            if (!is_array($relativeFilePaths = json_decode($json)))
                throw new PikeException("Failed to parse `{$fileListLocalName}`",
                                        PikeException::BAD_INPUT);
            // @allow \Pike\PikeException
            $this->package->extractMany("{$siteDirPath}{$targetDirName}",
                                        $relativeFilePaths);
        }
        return true;
    }
    /**
     * @param string $packageFilePath
     * @return bool
     * @throws \Pike\PikeException
     */
    private function selfDestruct(string $packageFilePath): bool {
        return $this->fs->unlink($packageFilePath);
    }
}
