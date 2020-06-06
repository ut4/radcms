<?php

declare(strict_types=1);

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
    public function makeRelease(string $toDir,
                                \Closure $printFn,
                                callable $shellExecFn): void {
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
    private function copySourceFiles(): void {
        $this->doPrint->__invoke('Copying files...');
        // @allow \Pike\PikeException
        $this->createTargetDirectories();
        // @allow \Pike\PikeException
        $this->copyBackendFiles();
        // @allow \Pike\PikeException
        $this->copyFrontendFiles();
        $this->doPrint->__invoke('Done.');
    }
    /**
     * @throws \Pike\PikeException
     */
    private function createTargetDirectories(): void {
        $targetDirPaths = ["{$this->targetDirPath}backend/assets",
                           "{$this->targetDirPath}frontend"];
        foreach ($targetDirPaths as $p) {
            if ($this->fs->isDir($p)) {
                $alreadyContainsEntries = (new \FilesystemIterator($p))->valid();
                if (!$alreadyContainsEntries) continue;
                throw new PikeException("`{$p}` already exists and is not empty",
                                        PikeException::BAD_INPUT);
            }
            if (!$this->fs->mkDir($p))
                throw new PikeException("Failed to create `{$p}`",
                                        PikeException::FAILED_FS_OP);
        }
    }
    /**
     * @throws \Pike\PikeException
     */
    private function copyBackendFiles(): void {
        foreach (['backend/assets/schema.mariadb.sql',
                  'backend/composer.json',
                  'index.php',
                  'install.php',
                  'LICENSE.txt'] as $f) {
            if (!$this->fs->copy($this->radPath . $f, $this->targetDirPath . $f))
                throw new PikeException('Failed to copy `' . ($this->radPath . $f) .
                                        '` -> `' . ($this->targetDirPath . $f) . '`');
        }
        //
        call_user_func($this->shellExecFn, self::makeCpCmd(
            "{$this->radPath}backend/src/",
            "{$this->targetDirPath}backend/src/"
        ));
        if (!$this->fs->isFile("{$this->targetDirPath}backend/src/App.php"))
            throw new PikeException("Failed to copy `{$this->radPath}backend/src/*`" .
                                    " -> `{$this->targetDirPath}backend/src/`",
                                    PikeException::FAILED_FS_OP);
        //
        call_user_func($this->shellExecFn, self::makeCpCmd(
            "{$this->radPath}backend/installer/",
            "{$this->targetDirPath}backend/installer/",
            'tests'
        ));
        if (!$this->fs->isFile("{$this->targetDirPath}backend/installer/src/Installer.php"))
            throw new PikeException("Failed to copy `{$this->radPath}backend/installer/*`" .
                                    " -> `{$this->targetDirPath}backend/installer/`",
                                    PikeException::FAILED_FS_OP);
    }
    /**
     * @throws \Pike\PikeException
     */
    private function copyFrontendFiles(): void {
        foreach ([
            ['frontend-src/cpanel-app/cpanel.css', 'frontend/cpanel-app.css'],
            ['frontend-src/install-app/install-app.css', 'frontend/install-app.css'],
            ['frontend/rad-auth-apps.js', null],
            ['frontend/rad-commons.js', null],
            ['frontend/rad-cpanel-app.js', null],
            ['frontend/rad-cpanel-commons.js', null],
            ['frontend/rad-install-app.js', null],
        ] as [$from, $to]) {
            if (!$to) $to = $from;
            if (!$this->fs->copy($this->radPath . $from, $this->targetDirPath . $to))
                throw new PikeException('Failed to copy `' . ($this->radPath . $from) .
                                        '` -> `' . ($this->targetDirPath . $to) . '`');
        }
        foreach ([
            ['frontend-src/commons/common.css', 'frontend/common.css'],
        ] as [$from, $to]) {
            if (!($contents = $this->fs->read($this->radPath . $from)))
                throw new PikeException('Failed to read `' . ($this->radPath . $from) . '`');
            if (!$this->fs->write($this->targetDirPath . $to,
                                  // 'url("../../frontend/assets' -> 'url("assets'
                                  str_replace('../../frontend/', '', $contents)))
                throw new PikeException('Failed to write `' . ($this->targetDirPath . $to) . '`');
        }
        //
        foreach(['assets', 'vendor'] as $p) {
            call_user_func($this->shellExecFn, self::makeCpCmd(
                "{$this->radPath}frontend/{$p}/",
                "{$this->targetDirPath}frontend/{$p}/"
            ));
            if (!$this->fs->isFile("{$this->targetDirPath}frontend/{$p}/LICENSES.txt"))
                throw new PikeException("Failed to copy `{$this->radPath}frontend/{$p}/*`" .
                                        " -> `{$this->targetDirPath}frontend/{$p}/`",
                                        PikeException::FAILED_FS_OP);
        }
    }
    /**
     * @throws \Pike\PikeException
     */
    private function installBackendVendorDeps(): void {
        $this->doPrint->__invoke('cd <targetDir>/backend...');
        $originalCwd = getcwd();
        chdir("{$this->targetDirPath}backend");
        $this->doPrint->__invoke('Executing `composer install`...');
        call_user_func($this->shellExecFn, 'composer install --no-dev --optimize-autoloader');
        if (!$this->fs->isFile("{$this->targetDirPath}backend/vendor/autoload.php"))
            throw new PikeException('Failed to `composer install`',
                                    PikeException::FAILED_FS_OP);
        $this->doPrint->__invoke('cd <currentWorkingDir>...');
        chdir($originalCwd);
        $this->doPrint->__invoke('Done.');
    }
    /**
     * @return string esim. `rsync -r --exclude 'kansio' /mistä/ /mihin/`
     */
    private static function makeCpCmd($from, $to, ...$exclude): string {
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
                $excludes = implode(' ', array_map(function ($path) {
                    return "--exclude " . (PHP_OS === 'Darwin' ? $path : "\'{$path}\'");
                }, $exclude)) . ' ';
            }
        }
        return $isWin
            ? "robocopy {$from} {$to} /e{$excludes}"
            : "rsync -r {$excludes}{$from} {$to}";
    }
}
