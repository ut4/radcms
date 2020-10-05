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
            ->field('name', 'Nimi')
                ->dataType('text', 128)
                ->visibility(ACL::ROLE_SUPER_ADMIN)
                ->validationRule('maxLength', 128)
            ->field('fields', 'Kentät')
                ->dataType('json')
                ->widget('multiField')
        ->done()[0]->toCompactForm();
    }
    /**
     * @param \RadCms\BaseAPI $api
     */
    public function init(BaseAPI $api): void {
        $api->registerDirectiveMethod('fetchMultiField', [$this, 'fetchMultiField'],
            'WebsiteLayout');
        $api->registerDirectiveMethod('fetchMultiFields', [$this, 'fetchMultiFields'],
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
                'formImpl' => 'Default',
                'formImplProps' => [
                    'multiFieldProps' => ['fieldsToDisplay' => $cfg->fieldsToDisplay ?? []]
                ],
                'title' => $cfg->title ?? 'Sisältö',
                'subtitle' => $name,
                'highlight' => $cfg->highlight ?? null
            ]);
        }
        //
        return ($node = $q->exec()) ? self::toMultiField($node) : null;
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
    public function fetchMultiFields(string $frontendPanelTitle, ...$args): array {
        $tmpl = array_pop($args);
        $q = $tmpl->fetchAll('MultiFieldBlobs')->addFrontendPanel([
            'title' => $frontendPanelTitle,
            'impl' => StockFrontendPanelImpls::DEFAULT_COLLECTION,
            'title' => $frontendPanelTitle,
            'highlight' => $args[1] ?? null
        ]);
        call_user_func($args[0], $q);
        //
        if (($nodes = $q->exec())) {
            $out = [];
            foreach ($nodes as $node)
                $out[] = self::toMultiField($node);
            return $out;
        }
        return [];
    }
    private static function toMultiField(\stdClass $fromDb) {
        $out = (object) ['fields' => json_decode($fromDb->fields),
                         'defaults' => null];
        foreach ($out->fields as $field)
            $out->{$field->name} = $field->value;
        $out->defaults = $fromDb;
        return $out;
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
