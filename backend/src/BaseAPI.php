<?php

namespace RadCms;

/**
 * Teemoissa ja lisäosissa käytettävä luokka.
 */
class BaseAPI {
    private $apiConfigs;
    /**
     * @param \RadCms\APIConfigsStorage $configs
     */
    public function __construct(APIConfigsStorage $configs) {
        $this->apiConfigs = $configs;
    }
    /**
     * Rekisteröi <?= $this->DirectiveName(...) ?> käytettäväksi templaatteista.
     * Esimerkki: registerDirective('Movies', RAD_SITE_PATH . 'plugins/foo/movies.inc');
     *
     * @param string $directiveName
     * @param string $fullFilePath
     * @param string $for = '*' '*'|'WebsiteLayout'|'path-of-the-file.tmpl.php'
     * @throws \Pike\PikeException
     */
    public function registerDirective($directiveName, $fullFilePath, $for = '*') {
        // @allow \Pike\PikeException
        $this->apiConfigs->putTemplateAlias($directiveName, $fullFilePath, $for);
    }
    /**
     * Rekisteröi <?php $this->methodName(...) ?> käytettäväksi templaatteista.
     *
     * @param string $methodName
     * @param \Closure|callable $fn
     * @param string $for = '*' '*'|'WebsiteLayout'|'path-of-the-file.tmpl.php'
     * @param bool $bindToDirectiveScope = false
     * @throws \Pike\PikeException
     */
    public function registerDirectiveMethod($methodName,
                                            callable $fn,
                                            $for = '*',
                                            $bindToDirectiveScope = false) {
        // @allow \Pike\PikeException
        $this->apiConfigs->putTemplateMethod($methodName,
                                             $fn,
                                             $bindToDirectiveScope,
                                             $for);
    }
}
