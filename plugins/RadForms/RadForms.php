<?php declare(strict_types=1);

namespace RadPlugins\RadForms;

use Pike\{PikeException, Validation};
use RadCms\Content\DAO;
use RadCms\ContentType\{ContentTypeCollection, ContentTypeMigrator};
use RadCms\Plugin\{PluginInterface, PluginAPI};
use RadCms\Entities\PluginPackData;
use RadCms\Templating\MagicTemplate;

final class RadForms implements PluginInterface {
    /**
     * @param \RadCms\Plugin\PluginAPI $api
     */
    public function init(PluginAPI $api): void {
        $api->registerDirectiveMethod('radFormsFetchForm',
            [self::class, 'validatePropsAndFetchForm']);
        $api->registerDirective('RadForm', 'templates/tag.RadForm.tmpl.php');
        $api->registerRoute('POST', '/plugins/rad-forms/handle-submit/[i:formId]',
                            Controllers::class, 'processFormSubmit');
    }
    /**
     * @param \RadCms\ContentType\ContentTypeMigrator $migrator
     * @param array $initialContentFromPackage
     */
    public function install(ContentTypeMigrator $migrator,
                            array $initialContentFromPackage): void {
        // @allow \Pike\PikeException
        $migrator->installMany(self::makeOwnContentTypes(),
                               $initialContentFromPackage);
    }
    /**
     * @param \RadCms\ContentType\ContentTypeMigrator $migrator
     */
    public function uninstall(ContentTypeMigrator $migrator): void {
        // @allow \Pike\PikeException
        $migrator->uninstallMany(self::makeOwnContentTypes());
    }
    /**
     * @param \RadCms\Content\DAO $dao
     * @param \RadCms\Entities\PluginPackData $to
     */
    public function pack(DAO $dao, PluginPackData $to): void {
        // @allow \Pike\PikeException
        $forms = $dao->fetchAll('Forms')->exec();
        $to->initialContent = [['Forms', $forms]];
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
            ->fetchOne('Forms')
            ->where('name = ?', $props->name)
            ->addFrontendPanel([
                'title' => $props->frontendPanelTitle ?? 'Lomake',
                'subtitle' => $props->name,
                'highlight' => 'form'
            ])
            ->exec();
    }
    /**
     * @return \RadCms\ContentType\ContentTypeCollection
     */
    private static function makeOwnContentTypes(): ContentTypeCollection {
        return ContentTypeCollection::build()
        ->add('Forms', 'Lomakkeet')
            ->field('name', 'Nimi')
            ->field('behaviours')->dataType('json')->widget('hidden')
        ->done();
    }
}
