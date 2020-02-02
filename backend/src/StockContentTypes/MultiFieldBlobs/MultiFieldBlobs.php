<?php

namespace RadCms\StockContentTypes\MultiFieldBlobs;

use RadCms\Theme\API;
use RadCms\Templating\StockFrontendPanelImpls;

class MultiFieldBlobs {
    public const DEFINITION = ['MultiFieldBlobs', 'Monikenttäsisältö', [
        'name' => 'text:Nimi:textField',
        'fields' => 'json:Kentät:multiFieldBuilder'
    ]];
    /**
     * @param \RadCms\Theme\API $api
     */
    public function init(API $api) {
        $api->registerDirectiveMethod('fetchMultiField', [$this, 'fetchMultiField']);
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
