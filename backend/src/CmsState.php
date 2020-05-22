<?php

declare(strict_types=1);

namespace RadCms;

use RadCms\ContentType\ContentTypeCollection;

/**
 * Accessor / varasto datalle, joka haetaan tietokannasta jokaisen
 * App->handleRequest() -kutsun yhteydessä. @see CmsStateLoader.
 */
class CmsState {
    /** @var \stdClass */
    private $raw;
    /** @var \ArrayObject */
    private $plugins;
    /** @var \RadCms\ContentType\ContentTypeCollection */
    private $contentTypes;
    /** @var \RadCms\APIConfigsStorage */
    private $apiState;
    /**
     * @param object $dataFromDb {siteInfo: {name: string, lang: string}, contentTypesLastUpdated: int, installedPluginNames: string[], compactContentTypes: \stdClass[], compactAclRules: {resources: \stdClass, userPermissions: \stdClass}}
     * @param \RadCms\APIConfigsStorage $apiState
     */
    public function __construct(\stdClass $dataFromDb,
                                APIConfigsStorage $apiState) {
        $this->raw = $dataFromDb;
        $this->plugins = new \ArrayObject;
        $this->contentTypes = ContentTypeCollection::fromCompactForm(
            $this->raw->compactContentTypes);
        $this->apiState = $apiState;
    }
    /**
     * @return \ArrayObject
     */
    public function getPlugins(): \ArrayObject {
        return $this->plugins;
    }
    /**
     * @return \RadCms\ContentType\ContentTypeCollection
     */
    public function getContentTypes(): ContentTypeCollection {
        return $this->contentTypes;
    }
    /**
     * @return \stdClass {resources: \stdClass, userPermissions: \stdClass}
     */
    public function getAclRules(): \stdClass {
        return $this->raw->compactAclRules;
    }
    /**
     * @return \RadCms\APIConfigsStorage
     */
    public function getApiConfigs(): APIConfigsStorage {
        return $this->apiState;
    }
    /**
     * @return \stdClass {name: string, lang: string}
     */
    public function getSiteInfo(): \stdClass {
        return $this->raw->siteInfo;
    }
}
