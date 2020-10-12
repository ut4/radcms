<?php

declare(strict_types=1);

namespace RadCms\Cli;

use Pike\Auth\Crypto;
use Pike\Interfaces\FileSystemInterface;
use Pike\PikeException;
use RadCms\Packager\PackageStreamInterface;
use RadCms\Packager\PackageUtils;
use RadCms\Update\UpdateInstaller;

final class UpdatePackageGenerator {
    /** @var \RadCms\Packager\PackageStreamInterface */
    private $output;
    /** @var \Pike\Interfaces\FileSystemInterface */
    private $fs;
    /** @var \Pike\Auth\Crypto */
    private $crypto;
    /**
     * @param \RadCms\Packager\PackageStreamInterface $output
     * @param \Pike\Interfaces\FileSystemInterface $fs
     * @param \Pike\Auth\Crypto $crypto
     */
    public function __construct(PackageStreamInterface $output,
                                FileSystemInterface $fs,
                                Crypto $crypto) {
        $this->output = $output;
        $this->fs = $fs;
        $this->crypto = $crypto;
    }
    /**
     * @param string $configFileName e.g. 'update-details.json', relatiivinen RAD_WORKSPACE_PATHiin
     * @param string $signingKey Olettaa että validi, 32 merkkiä pitkä
     * @param string $targetSiteSecret Kohdesivuston RAD_SECRET
     * @return \RadCms\Packager\PackageStreamInterface
     */
    public function generate(string $configFileName,
                             string $signingKey,
                             string $targetSiteSecret): PackageStreamInterface {
        // @allow \Pike\PikeException
        $settings = $this->readInputSettings($configFileName);
        // @allow \Pike\PikeException
        $this->output->open(RAD_WORKSPACE_PATH . $this->crypto->genRandomToken(32) .
                            '.update', true);
        $this->output->addFromString(UpdateInstaller::LOCAL_NAMES_SITE_SECRET_HASH,
                                     $this->crypto->hashPass($targetSiteSecret));
        $packageUtils = new PackageUtils($this->output, $this->crypto);
        // @allow \Pike\PikeException
        $packageUtils->addFilesAndFilesList($settings->backendFilesList,
                                            RAD_BACKEND_PATH,
                                            UpdateInstaller::LOCAL_NAMES_BACKEND_FILES_LIST,
                                            $signingKey);
        //
        return $this->output;
    }
    /**
     * @param string $configFileName
     * @return \stdClass
     */
    private function readInputSettings(string $configFileName): \stdClass {
        $configFilePath = RAD_WORKSPACE_PATH . $configFileName;
        // @allow \Pike\PikeException
        if (!($settingsJson = $this->fs->read($configFilePath)))
            throw new PikeException("Failed to read `{$configFilePath}`",
                                    PikeException::FAILED_FS_OP);
        if (($config = json_decode($settingsJson ?? '')) === null)
            throw new PikeException('$configFilePath must be a valid json file',
                                    PikeException::BAD_INPUT);
        if (!is_object($config))
            throw new PikeException('config must be an object',
                                    PikeException::BAD_INPUT);
        if (!is_array($config->backendFilesList) || !$config->backendFilesList)
            throw new PikeException('config->backendFilesList must exist and mustn\'t be empty',
                                    PikeException::BAD_INPUT);
        $this->validateInputSettings($config);
        return $config;
    }
    /**
     * @param \stdClass $config
     */
    private function validateInputSettings(\stdClass $config): void {
        if (!is_array($config->backendFilesList) || !$config->backendFilesList)
            throw new PikeException('config->backendFilesList must exist and mustn\'t be empty',
                                    PikeException::BAD_INPUT);
    }
}
