<?php

namespace RadCms;

use RadCms\ContentType\ContentTypeCollection;

/**
 * Accessor / varasto datalle, joka haetaan tietokannasta jokaisen
 * App->handleRequest() -kutsun yhteydessä. @see CmsStateLoader.
 */
class CmsState {
    private $raw;
    private $plugins;
    private $contentTypes;
    private $apiConfigs;
    /**
     * @param object $dataFromDb {siteInfo: {name: string, lang: string}, contentTypesLastUpdated: int, installedPluginNames: string[], compactContentTypes: \stdClass[], compactAclRules: {resources: \stdClass, userPermissions: \stdClass}}
     * @param \RadCms\APIConfigsStorage $apiConfigs
     */
    public function __construct($dataFromDb, APIConfigsStorage $apiConfigs) {
        $this->raw = $dataFromDb;
        $this->plugins = new \ArrayObject;
        $this->contentTypes = ContentTypeCollection::fromCompactForm(
            $this->raw->compactContentTypes);
        $this->apiConfigs = $apiConfigs;
    }
    /**
     * @return \ArrayObject
     */
    public function getPlugins() {
        return $this->plugins;
    }
    /**
     * @return \RadCms\ContentType\ContentTypeCollection
     */
    public function getContentTypes() {
        return $this->contentTypes;
    }
    /**
     * @return \stdClass {resources: \stdClass, userPermissions: \stdClass}
     */
    public function getAclRules() {
        return $this->raw->compactAclRules;
    }
    /**
     * @return \RadCms\APIConfigsStorage
     */
    public function getApiConfigs() {
        return $this->apiConfigs;
    }
    /**
     * @return \stdClass {name: string, lang: string}
     */
    public function getSiteInfo() {
        return $this->raw->siteInfo;
    }
}
