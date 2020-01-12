<?php

namespace RadCms\Cli;

use Pike\PikeException;
use Pike\FileSystemInterface;

class Bundler {
    private $fs;
    private $doPrint;
    private $shellExecFn;
    private $radPath;
    private $targetDirPath;
    /**
     * @param \Pike\FileSystemInterface
     */
    public function __construct(FileSystemInterface $fs) {
        $this->fs = $fs;
    }
    /**
     * @param string $toDir Kohdekansio johon RadCMS halutaan bundlata. Relatiivinen komentokehotteen ajosijaintiin.
     * @param \Closure $printFn function ($msg) { echo $msg . PHP_EOL; }
     * @param callable $shellExecFn function ($cmd) { return shell_exec($cmd); }
     * @throws \Pike\PikeException
     */
    public function makeRelease($toDir, \Closure $printFn, callable $shellExecFn) {
        $this->doPrint = $printFn;
        $this->shellExecFn = $shellExecFn;
        $this->radPath = dirname(__DIR__) . '/';
        $this->targetDirPath = __DIR__ . '/' . rtrim($toDir, '/') . '/';
        // @allow \Pike\PikeException
        $this->copySourceFiles();
        // @allow \Pike\PikeException
        $this->installBackendVendorDeps();
    }
    /**
     * Luo kohdekansion $this->targetDirPath, ja kopioi sinne
     * rad/<kansio*>/<kaikkiRelevantitTiedostot>.
     */
    private function copySourceFiles() {
        $this->doPrint->__invoke("Kopioidaan tiedostoja...");
        // @allow \Pike\PikeException
        $this->createTargetDirectories();
        // @allow \Pike\PikeException
        $this->copyBackendFiles();
        // @allow \Pike\PikeException
        $this->copyFrontendFiles();
        $this->doPrint->__invoke("Done.");
    }
    /**
     * @throws \Pike\PikeException
     */
    private function createTargetDirectories() {
        $targetDirPaths = ["{$this->targetDirPath}backend", "{$this->targetDirPath}frontend"];
        foreach ($targetDirPaths as $p) {
            if (!$this->fs->isDir($p) && !$this->fs->mkDir($p))
                throw new PikeException("Failed to create `{$p}`",
                                        PikeException::FAILED_FS_OP);
        }
    }
    /**
     * @throws \Pike\PikeException
     */
    private function copyBackendFiles() {
        foreach (['backend/composer.json', 'index.php', 'install.php', 'LICENSE.txt'] as $f) {
            if (!$this->fs->copy($this->radPath . $f, $this->targetDirPath . $f))
                throw new PikeException('Failed to copy `' . ($this->radPath . $f) .
                                        '` -> `' . ($this->targetDirPath . $f) . '`');
        }
        //
        call_user_func($this->shellExecFn, self::makeCpCmd(
            "{$this->radPath}backend/src/",
            "{$this->targetDirPath}backend/src/",
            'Tests'
        ));
        if (!$this->fs->isFile("{$this->targetDirPath}backend/src/App.php"))
            throw new PikeException("Failed to copy `{$this->radPath}backend/src/*`" .
                                    " -> `{$this->targetDirPath}backend/src/`",
                                    PikeException::FAILED_FS_OP);
        //
        call_user_func($this->shellExecFn, self::makeCpCmd(
            "{$this->radPath}backend/installer/",
            "{$this->targetDirPath}backend/installer/"
        ));
        if (!$this->fs->isFile("{$this->targetDirPath}backend/installer/src/Installer.php"))
            throw new PikeException("Failed to copy `{$this->radPath}backend/installer/*`" .
                                    " -> `{$this->targetDirPath}backend/installer/`",
                                    PikeException::FAILED_FS_OP);
    }
    /**
     * @throws \Pike\PikeException
     */
    private function copyFrontendFiles() {
        call_user_func($this->shellExecFn, self::makeCpCmd(
            "{$this->radPath}frontend/",
            "{$this->targetDirPath}frontend/",
            'cpanel-app/tests',
            'install-app/tests',
            'tests',
            'tests-vendor',
            'index.d.ts',
            'rad-commons.bundle.js',
            'rad-cpanel-boot.bundle.js',
            'rad-cpanel.bundle.js',
            'tests.html'
        ));
        if (!$this->fs->isFile("{$this->targetDirPath}frontend/rad-commons.js"))
            throw new PikeException("Failed to copy `{$this->radPath}frontend/*`" .
                                    " -> `{$this->targetDirPath}frontend/`",
                                    PikeException::FAILED_FS_OP);
    }
    /**
     * @throws \Pike\PikeException
     */
    private function installBackendVendorDeps() {
        $this->doPrint->__invoke("cd <targetDir>/backend...");
        $originalCwd = getcwd();
        chdir("{$this->targetDirPath}backend");
        $this->doPrint->__invoke("Ajetaan `composer install`...");
        call_user_func($this->shellExecFn, 'composer install --no-dev --optimize-autoloader');
        if (!$this->fs->isFile("{$this->targetDirPath}backend/vendor/autoload.php"))
            throw new PikeException("Failed to `composer install`",
                                    PikeException::FAILED_FS_OP);
        $this->doPrint->__invoke("cd <currentWorkingDir>...");
        chdir($originalCwd);
        $this->doPrint->__invoke("Done.");
    }
    /**
     * @return string esim. `rsync -r --exclude 'kansio' /mistä/ /mihin/`
     */
    private static function makeCpCmd($from, $to, ...$exclude) {
        $isWin = strtoupper(substr(PHP_OS, 0, 3)) === 'WIN';
        $excludes = '';
        if ($exclude) {
            if ($isWin) {
                $dirs = [];
                $files = [];
                foreach ($exclude as $path) {
                    if (strpos($path, '.') === false) $dirs[] = $path;
                    else $files[] = $path;
                }
                $excludes = (!$dirs ? '' : ' /xd ' . implode(' ', $dirs)) .
                            (!$files ? '' : ' /xf ' . implode(' ', $files));
            } else {
                $excludes = ' ' . implode(' ', array_map(function ($path) {
                    return "--exclude \'{$path}\'";
                }, $exclude)) . ' ';
            }
        }
        return $isWin
            ? "robocopy {$from} {$to} /e{$excludes}"
            : "rsync -r{$excludes}{$from} {$to}";
    }
}
