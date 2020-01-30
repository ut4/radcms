<?php

namespace RadCms\Theme;

use RadCms\Templating\MagicTemplate;
use Pike\FileSystem;
use Pike\PikeException;

/**
 * Teeman oma API. Passataan teeman (ThemeInterface) init-metodiin.
 */
class API {
    private $fs;
    /**
     * @param \Pike\FileSystem $fs
     */
    public function __construct(FileSystem $fs) {
        $this->fs = $fs;
    }
    /**
     * Rekisteröi <?= $this->DirectiveName(...) ?> käytettäväksi templaatteista.
     * Esimerkki: registerDirective('MPMovies', RAD_SITE_PATH . 'plugins/MyTheme/movies.inc');
     *
     * @param string $directiveName
     * @param string $fullFilePath
     * @throws \Pike\PikeException
     */
    public function registerDirective($directiveName, $fullFilePath) {
        if (!$this->fs->isFile($fullFilePath))
            throw new PikeException("Failed to locate `{$fullFilePath}`",
                                    PikeException::FAILED_FS_OP);
        // @allow \Pike\PikeException
        MagicTemplate::registerAlias($directiveName, $fullFilePath);
    }
    /**
     * Rekisteröi <?php $this->methodName(...) ?> käytettäväksi templaatteista.

     * @param string $methodName
     * @param \Closure|callable $fn
     * @param bool $bindToDirectiveScope = false
     * @throws \Pike\PikeException
     */
    public function registerDirectiveMethod($methodName,
                                            callable $fn,
                                            $bindToDirectiveScope = false) {
        // @allow \Pike\PikeException
        MagicTemplate::registerMethod($methodName, $fn, $bindToDirectiveScope);
    }
}
