<?php

declare(strict_types=1);

namespace RadCms\StockContentTypes\MultiFieldBlobs;

use RadCms\Auth\ACL;
use RadCms\BaseAPI;
use RadCms\ContentType\ContentTypeCollection;
use RadCms\Templating\StockFrontendPanelImpls;

class MultiFieldBlobs {
    /**
     * @return \stdClass {name: string, friendlyName: string ...}
     */
    public static function asCompactForm(): \stdClass {
        return ContentTypeCollection::build()
        ->add('MultiFieldBlobs', 'Monikenttäsisältö')
        ->description('Joustava sisältö, jolla ei ole ennalta määriteltyä rakennetta.')
            ->field('name', 'Nimi')->dataType('text', 128)->visibility(ACL::ROLE_SUPER_ADMIN)
            ->field('fields', 'Kentät')->dataType('json')->widget('multiField')
        ->done()[0]->toCompactForm();
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
