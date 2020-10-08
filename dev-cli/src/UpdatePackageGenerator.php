<?php

declare(strict_types=1);

namespace RadCms\Cli;

use Pike\Auth\Crypto;
use Pike\Interfaces\FileSystemInterface;
use Pike\PikeException;
use RadCms\Packager\PackageStreamInterface;
use RadCms\Packager\PackageUtils;

final class UpdatePackageGenerator {
    public const LOCAL_NAMES_BACKEND_FILES_LIST = 'backend-files-list.json';
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
     * @return \RadCms\Packager\PackageStreamInterface
     */
    public function generate(string $configFileName,
                             string $signingKey): PackageStreamInterface {
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
        // @allow \Pike\PikeException
        $this->output->open(RAD_WORKSPACE_PATH . $this->crypto->genRandomToken(32) .
                            '.update', true);
        $packageUtils = new PackageUtils($this->output, $this->crypto);
        // @allow \Pike\PikeException
        $packageUtils->addFilesAndFilesList($config->backendFilesList,
                                            RAD_BACKEND_PATH,
                                            self::LOCAL_NAMES_BACKEND_FILES_LIST,
                                            $signingKey);
        //
        return $this->output;
    }
}
