<?php

declare(strict_types=1);

namespace RadCms\ContentType;

use Pike\Request;
use Pike\Response;
use Pike\Validation;
use Pike\ArrayUtils;
use Pike\ObjectValidator;
use RadCms\CmsState;
use Pike\PikeException;

/**
 * Handlaa /api/content-types -alkuiset pyynnöt.
 */
class ContentTypeControllers {
    /**
     * POST /api/content-types.
     *
     * @param \Pike\Request $req
     * @param \Pike\Response $res
     * @param \RadCms\ContentType\ContentTypeMigrator $migrator
     */
    public function handleCreateContentType(Request $req,
                                            Response $res,
                                            ContentTypeMigrator $migrator): void {
        if (($errors = $this->validateInsertInput($req->body))) {
            $res->status(400)->json($errors);
            return;
        }
        // @allow \Pike\PikeException
        $migrator->installSingle($req->body);
        $res->json(['ok' => 'ok']);
    }
    /**
     * GET /api/content-type/:name.
     *
     * @param \Pike\Request $req
     * @param \Pike\Response $res
     * @param \RadCms\CmsState $cmsState
     */
    public function handleGetContentType(Request $req,
                                         Response $res,
                                         CmsState $cmsState): void {
        // @allow \Pike\PikeException
        $contentType = self::getContentTypeOrThrow($req->params->name, $cmsState);
        if ($contentType) $res->json($contentType);
        else $res->status(404)->json(['got' => 'nothing']);
    }
    /**
     * GET /api/content-type/:filter.
     *
     * @param \Pike\Request $req
     * @param \Pike\Response $res
     * @param \RadCms\CmsState $cmsState
     */
    public function handleGetContentTypes(Request $req,
                                          Response $res,
                                          CmsState $cmsState): void {
        $filter = $req->params->filter ?? '';
        $res->json($filter !== 'no-internals'
            ? $cmsState->getContentTypes()->getArrayCopy()
            : ArrayUtils::filterByKey($cmsState->getContentTypes(),
                                      false,
                                      'isInternal')->getArrayCopy());
    }
    /**
     * PUT /api/content-types/:contentTypeName.
     *
     * @param \Pike\Request $req
     * @param \Pike\Response $res
     * @param \RadCms\ContentType\ContentTypeMigrator $migrator
     * @param \RadCms\CmsState $cmsState
     * @throws \Pike\PikeException
     */
    public function handleUpdateContentType(Request $req,
                                            Response $res,
                                            ContentTypeMigrator $migrator,
                                            CmsState $cmsState): void {
        if (($errors = $this->validateUpdateInput($req->body))) {
            $res->status(400)->json($errors);
            return;
        }
        // @allow \Pike\PikeException
        $contentType = self::getContentTypeOrThrow($req->params->contentTypeName,
                                                   $cmsState);
        // @allow \Pike\PikeException
        $migrator->updateSingle((object) [
                                    'name' => $req->body->name,
                                    'friendlyName' => $req->body->friendlyName,
                                    'isInternal' => $req->body->isInternal,
                                ],
                                $contentType,
                                $cmsState->getContentTypes());
        $res->json(['ok' => 'ok']);
    }
    /**
     * DELETE /api/content-types/:contentTypeName.
     *
     * @param \Pike\Request $req
     * @param \Pike\Response $res
     * @param \RadCms\ContentType\ContentTypeMigrator $migrator
     * @param \RadCms\CmsState $cmsState
     * @throws \Pike\PikeException
     */
    public function handleDeleteContentType(Request $req,
                                            Response $res,
                                            ContentTypeMigrator $migrator,
                                            CmsState $cmsState): void {
        // @allow \Pike\PikeException
        $contentType = self::getContentTypeOrThrow($req->params->contentTypeName,
                                                   $cmsState);
        // @allow \Pike\PikeException
        $migrator->uninstallSingle($contentType);
        $res->json(['ok' => 'ok']);
    }
    /**
     * POST /api/content-types/field/:contentTypeName.
     *
     * @param \Pike\Request $req
     * @param \Pike\Response $res
     * @param \RadCms\ContentType\ContentTypeMigrator $migrator
     * @param \RadCms\CmsState $cmsState
     * @throws \Pike\PikeException
     */
    public function handleAddFieldToContentType(Request $req,
                                                Response $res,
                                                ContentTypeMigrator $migrator,
                                                CmsState $cmsState): void {
        if (($errors = $this->validateAddFieldInput($req->body))) {
            $res->status(400)->json($errors);
            return;
        }
        // @allow \Pike\PikeException
        $contentType = self::getContentTypeOrThrow($req->params->contentTypeName,
                                                   $cmsState);
        // @allow \Pike\PikeException
        $migrator->addField(FieldDef::fromObject($req->body), $contentType);
        $res->json(['ok' => 'ok']);
    }
    /**
     * PUT /api/content-types/field/:contentTypeName/:fieldName.
     *
     * @param \Pike\Request $req
     * @param \Pike\Response $res
     * @param \RadCms\ContentType\ContentTypeMigrator $migrator
     * @param \RadCms\CmsState $cmsState
     * @throws \Pike\PikeException
     */
    public function handleUpdateFieldOfContentType(Request $req,
                                                   Response $res,
                                                   ContentTypeMigrator $migrator,
                                                   CmsState $cmsState): void {
        if (($errors = $this->validateAddFieldInput($req->body))) {
            $res->status(400)->json($errors);
            return;
        }
        // @allow \Pike\PikeException
        $contentType = self::getContentTypeOrThrow($req->params->contentTypeName,
                                                   $cmsState);
        // @allow \Pike\PikeException
        $field = self::getFieldOrThrow($req->params->fieldName, $contentType);
        // @allow \Pike\PikeException
        $migrator->updateField(FieldDef::fromObject($req->body),
                               $field,
                               $contentType);
        $res->json(['ok' => 'ok']);
    }
    /**
     * DELETE /api/content-types/field/:contentTypeName/:fieldName.
     *
     * @param \Pike\Request $req
     * @param \Pike\Response $res
     * @param \RadCms\ContentType\ContentTypeMigrator $migrator
     * @param \RadCms\CmsState $cmsState
     * @throws \Pike\PikeException
     */
    public function handleDeleteFieldFromContentType(Request $req,
                                                     Response $res,
                                                     ContentTypeMigrator $migrator,
                                                     CmsState $cmsState): void {
        // @allow \Pike\PikeException
        $contentType = self::getContentTypeOrThrow($req->params->contentTypeName,
                                                   $cmsState);
        // @allow \Pike\PikeException
        $field = self::getFieldOrThrow($req->params->fieldName, $contentType);
        // @allow \Pike\PikeException
        $migrator->removeField($field, $contentType);
        $res->json(['ok' => 'ok']);
    }
    /**
     * @return string[]
     */
    private static function validateInsertInput(\stdClass $input): array {
        return self::getBaseValidationRules()
            ->rule('fields.*.name', 'identifier')
            ->rule('fields.*.friendlyName', 'minLength', 1)
            ->rule('fields.*.dataType', 'in', ContentTypeValidator::FIELD_DATA_TYPES)
            ->rule('fields.*.defaultValue', 'type', 'string')
            ->rule('fields.*.visibility', 'type', 'int')
            ->rule('fields.*.widget.name', 'in', ContentTypeValidator::FIELD_WIDGETS)
            ->rule('fields.*.widget.args?', 'type', 'object')
            ->validate($input);
    }
    /**
     * @return string[]
     */
    private static function validateUpdateInput(\stdClass $input): array {
        return self::getBaseValidationRules()
            ->validate($input);
    }
    /**
     * @return string[]
     */
    private static function validateAddFieldInput(\stdClass $input): array {
        return (Validation::makeObjectValidator())
            ->rule('name', 'identifier')
            ->rule('friendlyName', 'minLength', 1)
            ->rule('dataType', 'in', ContentTypeValidator::FIELD_DATA_TYPES)
            ->rule('defaultValue', 'type', 'string')
            ->rule('visibility', 'type', 'int')
            ->rule('widget.name', 'in', ContentTypeValidator::FIELD_WIDGETS)
            ->rule('widget.args?', 'type', 'object')
            ->validate($input);
    }
    /**
     * @return \Pike\Validation\ObjectValidator
     */
    private static function getBaseValidationRules(): ObjectValidator {
        return (Validation::makeObjectValidator())
            ->rule('name', 'identifier')
            ->rule('name', 'maxLength', ContentTypeValidator::MAX_NAME_LEN)
            ->rule('friendlyName', 'type', 'string')
            ->rule('friendlyName', 'minLength', 1)
            ->rule('isInternal', 'type', 'bool');
    }
    /**
     * @return \RadCms\ContentType\ContentTypeDef
     */
    private static function getContentTypeOrThrow(string $name,
                                                  CmsState $from): ContentTypeDef {
        if (($contentType = ArrayUtils::findByKey($from->getContentTypes(),
                                                  $name,
                                                  'name')))
            return $contentType;
        throw new PikeException('Content type not found.', PikeException::BAD_INPUT);
    }
    /**
     * @return \RadCms\ContentType\FieldDef
     */
    private static function getFieldOrThrow(string $name,
                                            ContentTypeDef $from): FieldDef {
        if (($field = ArrayUtils::findByKey($from->fields, $name, 'name')))
            return $field;
        throw new PikeException('Field not found.', PikeException::BAD_INPUT);
    }
}
