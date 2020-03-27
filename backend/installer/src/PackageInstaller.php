<?php

declare(strict_types=1);

namespace RadCms\Installer;

use Pike\Db;
use Pike\PikeException;
use Pike\Auth\Crypto;
use RadCms\ContentType\ContentTypeCollection;
use RadCms\ContentType\ContentTypeMigrator;
use RadCms\Packager\Packager;
use RadCms\Packager\PackageStreamInterface;

/**
 * Asentaa sivuston pakettitiedostosta.
 */
class PackageInstaller {
    private $db;
    private $crypto;
    private $commons;
    private $package;
    /**
     * @param \Pike\Db $db
     * @param \Pike\Auth\Crypto $crypto
     * @param \RadCms\Installer\InstallerCommons $commons
     * @param \RadCms\Packager\PackageStreamInterface $package
     */
    public function __construct(Db $db,
                                Crypto $crypto,
                                InstallerCommons $commons,
                                PackageStreamInterface $package) {
        $this->db = $db;
        $this->crypto = $crypto;
        $this->commons = $commons;
        $this->package = $package;
    }
    /**
     * @param string $packageFilePath '/path/to/tmp/uploaded-package-file.radsite'
     * @param \stdClass $input {unlockKey: string, baseUrl: string}
     * @return bool
     * @throws \Pike\PikeException
     */
    public function doInstall(string $packageFilePath, \stdClass $input): bool {
        // @allow \Pike\PikeException
        $this->package->open($packageFilePath);
        // @allow \Pike\PikeException
        $mainData = $this->readMainData($input->unlockKey);
        $settings = $mainData->settings;
        $settings->baseUrl = $input->baseUrl;
        // @allow \Pike\PikeException
        return $this->commons->createOrOpenDb($settings) &&
               $this->commons->createMainSchema($settings,
                                                $this->package,
                                                Packager::LOCAL_NAMES_DB_SCHEMA) &&
               $this->commons->insertMainSchemaData($settings) &&
               $this->commons->createUserZero($settings, $mainData->user) &&
               $this->createContentTypesAndInsertData($mainData->contentTypes,
                                                      $mainData->content) &&
               $this->writeFiles() &&
               $this->commons->generateConfigFile($settings) &&
               $this->commons->selfDestruct();
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
        foreach ([Packager::LOCAL_NAMES_TEMPLATES_FILEMAP,
                  Packager::LOCAL_NAMES_ASSETS_FILEMAP] as $localName) {
            // @allow \Pike\PikeException
            $json = $this->package->read($localName);
            if (!is_array($relativeFilePaths = json_decode($json)))
                throw new PikeException("Failed to parse `{$localName}`",
                                        PikeException::BAD_INPUT);
            // @allow \Pike\PikeException
            $this->package->extractMany("{$siteDirPath}theme", $relativeFilePaths);
        }
        return true;
    }
}
