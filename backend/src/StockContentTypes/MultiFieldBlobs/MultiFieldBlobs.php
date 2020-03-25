<?php

namespace RadCms\StockContentTypes\MultiFieldBlobs;

use RadCms\BaseAPI;
use RadCms\Templating\StockFrontendPanelImpls;
use RadCms\Auth\ACL;

class MultiFieldBlobs {
    /**
     * @return \stdClass {name: string, friendlyName: string ...}
     */
    public static function asCompactForm() {
        return (object) [
            'name' => 'MultiFieldBlobs',
            'friendlyName' => 'Monikenttäsisältö',
            'fields' => [
                (object) [
                    'name' => 'name',
                    'dataType' => 'text',
                    'friendlyName' => 'Nimi',
                    'widget' => (object) ['name' => 'textField'],
                    'defaultValue' > '',
                    'visibility' => ACL::ROLE_SUPER_ADMIN
                ],
                (object) [
                    'name' => 'fields',
                    'dataType' => 'json',
                    'friendlyName' => 'Kentät',
                    'widget' => (object) ['name' => 'multiFieldBuilder'],
                    'defaultValue' > '',
                    'visibility' => 0
                ]
            ]
        ];
    }
    /**
     * @param \RadCms\BaseAPI $api
     */
    public function init(BaseAPI $api) {
        $api->registerDirectiveMethod('fetchMultiField', [$this, 'fetchMultiField'],
            'WebsiteLayout');
    }
    /**
     * @param string $name
     * @param string $frontendPanelTitle = 'Sisältö'
     * @param string $highlightSelector = null
     * @param \RadCms\Templating\MagicTemplate $tmpl
     */
    public function fetchMultiField($name,
                                    $frontendPanelTitle = 'Sisältö',
                                    $highlightSelector = null,
                                    $tmpl = null) {
        $node = $tmpl
            ->fetchOne('MultiFieldBlobs')
            ->createFrontendPanel(StockFrontendPanelImpls::Generic,
                                  $frontendPanelTitle,
                                  $highlightSelector)
            ->where('name = ?', $name)
            ->exec();
        if ($node) {
            $out = (object)['fields' => json_decode($node->fields)];
            $out->defaults = $node;
            return $out;
        }
        return null;
    }
}
