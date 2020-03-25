<?php

declare(strict_types=1);

namespace RadCms\StockContentTypes\MultiFieldBlobs;

use RadCms\BaseAPI;
use RadCms\Templating\StockFrontendPanelImpls;
use RadCms\Auth\ACL;

class MultiFieldBlobs {
    /**
     * @return \stdClass {name: string, friendlyName: string ...}
     */
    public static function asCompactForm(): \stdClass {
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
    public function init(BaseAPI $api): void {
        $api->registerDirectiveMethod('fetchMultiField', [$this, 'fetchMultiField'],
            'WebsiteLayout');
    }
    /**
     * @param string $name
     * @param string? $frontendPanelTitle
     * @param string? $highlightSelector
     * @param \RadCms\Templating\MagicTemplate $tmpl
     * @return \stdClass|null
     */
    public function fetchMultiField($name,
                                    $frontendPanelTitle,
                                    $highlightSelector,
                                    $tmpl = null): ?\stdClass {
        $node = $tmpl
            ->fetchOne('MultiFieldBlobs')
            ->createFrontendPanel(StockFrontendPanelImpls::Generic,
                                  $frontendPanelTitle ?? 'Sisältö',
                                  $highlightSelector,
                                  $name)
            ->where('name = ?', $name)
            ->exec();
        if ($node) {
            $out = (object) ['fields' => json_decode($node->fields),
                             'defaults' => null];
            foreach ($out->fields as $field)
                $out->{$field->name} = $field->value;
            $out->defaults = $node;
            return $out;
        }
        return null;
    }
}
