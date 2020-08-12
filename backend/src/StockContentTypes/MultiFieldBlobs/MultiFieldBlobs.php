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
            'description' => 'Joustava sisältö, jolla ei ole ennalta määriteltyä rakennetta.',
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
                    'widget' => (object) ['name' => 'multiField'],
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
     * Käyttö:
     * fetchMultiField('nimi', 'Sivusisältö', '.css-selector')
     * ... tai ...
     * fetchMultiField('nimi', [
     *     ['title' => 'Sivusisältö', 'fieldsToDisplay' => ['Otsikko', 'Teksti'], 'highlight' => '.css-selector'],
     *     ['title' => 'Otsakekuva', 'fieldsToDisplay' => ['Kuva'], 'highlight' => '.css-selector'],
     * ])
     *
     * @param string $name
     * @param array $args [?string|array $frontendPanelTitleOrArrayOfPanelConfigs, ?string $highlight, ?array $fieldsToDisplay, \RadCms\Templating\MagicTemplate $tmpl]
     * @return \stdClass|null Sisältönode
     */
    public function fetchMultiField(string $name, ...$args): ?\stdClass {
        $tmpl = array_pop($args);
        $q = $tmpl->fetchOne('MultiFieldBlobs')->where('name = ?', $name);
        //
        $contentPanelCfg = !$args || is_string($args[0])
            ? [(object) ['title' => $args[0] ?? null,
                         'fieldsToDisplay' => $args[2] ?? null,
                         'highlight' => $args[1] ?? null]]
            : self::normalizePanelConfigs($args[0]);
        foreach ($contentPanelCfg as $cfg) {
            $q->addFrontendPanel([
                'impl' => StockFrontendPanelImpls::DEFAULT_SINGLE,
                'editFormImpl' => 'Default',
                'editFormImplProps' => [
                    'multiFieldProps' => ['fieldsToDisplay' => $cfg->fieldsToDisplay ?? []]
                ],
                'title' => $cfg->title ?? 'Sisältö',
                'subtitle' => $name,
                'highlight' => $cfg->highlight ?? null
            ]);
        }
        //
        if (($node = $q->exec())) {
            $out = (object) ['fields' => json_decode($node->fields),
                             'defaults' => null];
            foreach ($out->fields as $field)
                $out->{$field->name} = $field->value;
            $out->defaults = $node;
            return $out;
        }
        return null;
    }
    /**
     * @access private
     */
    private static function normalizePanelConfigs(array $input): array {
        return array_map(function ($cfg) {
            if (!is_object($cfg))
                $cfg = (object) $cfg;
            return $cfg;
        }, $input);
    }
}
