<?php

declare(strict_types=1);

namespace RadCms\Installer;

use Pike\{Db, FileSystemInterface, PikeException};
use Pike\Auth\Crypto;
use RadCms\ContentType\{ContentTypeCollection, ContentTypeMigrator};
use RadCms\Packager\{Packager, PackageStreamInterface};
use RadCms\Plugin\{Plugin, PluginInstaller};

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
     * @param string $packageFilePath '/path/to/htdocs/long-random-string.radsite'
     * @param \stdClass $input {unlockKey: string, baseUrl: string}
     * @return \stdClass|null
     * @throws \Pike\PikeException
     */
    public function doInstall(string $packageFilePath, \stdClass $input): ?\stdClass {
        // @allow \Pike\PikeException
        $this->package->open($packageFilePath);
        // @allow \Pike\PikeException
        $mainData = $this->readEncryptedData(Packager::LOCAL_NAMES_MAIN_DATA,
                                             $input->unlockKey);
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
               $this->installPlugins($input->unlockKey) &&
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
    private function readEncryptedData(string $localName, string $unlockKey): \stdClass {
        // @allow \Pike\PikeException
        $encodedJson = $this->package->read($localName);
        // @allow \Pike\PikeException
        $decodedJson = $this->crypto->decrypt($encodedJson,
            Packager::makeFixedLengthKey($unlockKey));
        if (($parsed = json_decode($decodedJson)) !== null)
            return $parsed;
        throw new PikeException("Failed to parse `{$localName}`",
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
        [$workspaceDir, $publicDir] = $this->commons->createPublicAndWorkspaceDirs();
        //
        foreach ([
            [Packager::LOCAL_NAMES_PHP_FILES_FILE_LIST, "{$workspaceDir}site"],
            [Packager::LOCAL_NAMES_ASSETS_FILE_LIST, "{$publicDir}frontend"],
            [Packager::LOCAL_NAMES_UPLOADS_FILE_LIST, "{$publicDir}uploads"],
        ] as [$fileListLocalName, $targetDirPath]) {
            // @allow \Pike\PikeException
            $json = $this->package->read($fileListLocalName);
            if (!is_array($relativeFilePaths = json_decode($json)))
                throw new PikeException("Failed to parse `{$fileListLocalName}`",
                                        PikeException::BAD_INPUT);
            if ($relativeFilePaths)
                // @allow \Pike\PikeException
                $this->package->extractMany($targetDirPath,
                                            $relativeFilePaths);
        }
        return true;
    }
    /**
     * @return bool
     * @throws \Pike\PikeException
     */
    private function installPlugins(string $unlockKey): bool {
        // @allow Pike\PikeException
        $plugins = $this->readEncryptedData(Packager::LOCAL_NAMES_PLUGINS,
                                            $unlockKey);
        $installer = new PluginInstaller($this->db,
                                         $this->fs,
                                         new ContentTypeMigrator($this->db));
        foreach ($plugins as $name => $packData) {
            $plugin = new Plugin($name);
            // @allow Pike\PikeException
            $installer->install($plugin, $packData->initialContent);
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
