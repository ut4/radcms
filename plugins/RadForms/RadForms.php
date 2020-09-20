<?php declare(strict_types=1);

namespace RadPlugins\RadForms;

use Pike\{PikeException, Validation};
use RadCms\Content\DAO;
use RadCms\ContentType\ContentTypeCollection;
use RadCms\Plugin\{MigrationAPI, PluginInterface, PluginAPI};
use RadCms\Entities\PluginPackData;
use RadCms\Templating\MagicTemplate;

final class RadForms implements PluginInterface {
    /** @var ?bool */
    private $isValidationLibIncluded;
    /**
     * @param \RadCms\Plugin\PluginAPI $api
     */
    public function init(PluginAPI $api): void {
        //
        $api->registerDirective('RadForm', 'templates/tag.RadForm.tmpl.php');
        $api->registerDirectiveMethod('radFormsFetchForm',
            [self::class, 'validatePropsAndFetchForm']);
        $api->registerDirectiveMethod('radFormsGetSetIsValidationLibLoaded', function () {
            if ($this->isValidationLibIncluded) return true;
            $this->isValidationLibIncluded = true;
            return false;
        });
        //
        $api->enqueueAdminJsFile('plugins/rad-forms/rad-forms-bundled.js');
        //
        $api->registerRoute('POST', '/plugins/rad-forms/handle-submit/[i:formId]',
                            Controllers::class, 'processFormSubmit');
    }
    /**
     * @param \RadCms\Plugin\MigrationAPI $api
     * @param array $initialContentFromPackage
     */
    public function install(MigrationAPI $api,
                            array $initialContentFromPackage): void {
        // @allow \Pike\PikeException
        $api->installContentTypes(self::makeOwnContentTypes(),
                                  $initialContentFromPackage);
        // @allow \Pike\PikeException
        $api->copyPublicAssets('frontend-assets');
    }
    /**
     * @param \RadCms\Plugin\MigrationAPI $api
     */
    public function uninstall(MigrationAPI $api): void {
        // @allow \Pike\PikeException
        $api->uninstallContentTypes(self::makeOwnContentTypes());
    }
    /**
     * @param \RadCms\Content\DAO $dao
     * @param \RadCms\Entities\PluginPackData $to
     */
    public function pack(DAO $dao, PluginPackData $to): void {
        // @allow \Pike\PikeException
        $forms = $dao->fetchAll('RadForms')->exec();
        $to->initialContent = [['RadForms', $forms]];
    }
    /**
     * @param object $props
     * @param \RadCms\Templating\MagicTemplate $tmpl
     * @return object|array|null
     */
    public static function validatePropsAndFetchForm(object $props, MagicTemplate $tmpl) {
        //
        if (($errors = Validation::makeObjectValidator()
            ->rule('name', 'type', 'string')
            ->rule('template', 'type', 'string')
            ->validate($props)))
                throw new PikeException(implode('<br>', $errors));
        //
        return $tmpl
            ->fetchOne('RadForms')
            ->where('name = ?', $props->name)
            ->addFrontendPanel([
                'title' => $props->frontendPanelTitle ?? 'Lomake',
                'subtitle' => $props->name,
                'formImpl' => 'RadFormsForm',
                'highlight' => 'form'
            ])
            ->exec();
    }
    /**
     * @return \RadCms\ContentType\ContentTypeCollection
     */
    private static function makeOwnContentTypes(): ContentTypeCollection {
        return ContentTypeCollection::build()
        ->add('RadForms', 'Lomakkeet')
        ->frontendFormImpl('RadFormsForm')
            ->field('name', 'Nimi')
            ->field('behaviours')->dataType('json')->widget('hidden')
                ->defaultValue(self::makeNewFormDefaultBehaviours())
        ->done();
    }
    /**
     */
    private static function makeNewFormDefaultBehaviours(): string {
        return json_encode([(object) [
            'name' => 'SendMail',
            'data' => (object) [
                'subjectTemplate' => 'Uusi yhteydenotto sivustolta [siteName]',
                'toAddress' => 'sivuston-omistaja@mail.com',
                'fromAddress' => 'no-reply@sivuston-nimi.com',
                'bodyTemplate' =>
                    "Yhteydenotto sivustolta [siteName]\n\n" .
                    "Lyhyt kenttä: [myFormInputName1]\n" .
                    "Pitkä kenttä:\n[myFormInputName2]\n\n".
                    "------------\n" .
                    "(Tämä viesti lähetettiin RadForms-lisäosalla)\n"
            ],
        ]]);
    }
}
