<?php

declare(strict_types=1);

namespace RadCms\ContentType;

use Pike\{ArrayUtils, ObjectValidator, PikeException, Request, Response, Validation};
use RadCms\CmsState;
use RadCms\ContentType\Internal\ContentTypeRepository;

/**
 * Handlaa /api/content-types -alkuiset pyynnöt.
 */
class ContentTypeControllers {
    private const MAX_DESCRIPTION_LENGTH = 512;
    private const MAX_FIELD_DEFAULT_VALUE_LENGTH = 2048;
    private const MAX_FRIENDLY_NAME_LENGTH = 128;
    /**
     * POST /api/content-types.
     *
     * @param \Pike\Request $req
     * @param \Pike\Response $res
     * @param \RadCms\ContentType\ContentTypeRepository $repo
     */
    public function handleCreateContentType(Request $req,
                                            Response $res,
                                            ContentTypeRepository $repo): void {
        if (($errors = $this->validateInsertInput($req->body))) {
            $res->status(400)->json($errors);
            return;
        }
        // @allow \Pike\PikeException
        $repo->installSingle($req->body);
        $res->json(['ok' => 'ok']);
    }
    /**
     * GET /api/content-types/:name.
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
     * GET /api/content-types/:filter.
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
     * @param \RadCms\ContentType\ContentTypeRepository $repo
     * @param \RadCms\CmsState $cmsState
     * @throws \Pike\PikeException
     */
    public function handleUpdateBasicInfoOfContentType(Request $req,
                                                       Response $res,
                                                       ContentTypeRepository $repo,
                                                       CmsState $cmsState): void {
        if (($errors = $this->validateUpdateBasicInfoInput($req->body))) {
            $res->status(400)->json($errors);
            return;
        }
        // @allow \Pike\PikeException
        $contentType = self::getContentTypeOrThrow($req->params->contentTypeName,
                                                   $cmsState);
        // @allow \Pike\PikeException
        $repo->updateSingle((object) [
                                'name' => $req->body->name,
                                'friendlyName' => $req->body->friendlyName,
                                'description' => $req->body->description,
                                'isInternal' => $req->body->isInternal,
                            ],
                            $contentType,
                            $cmsState->getContentTypes());
        $res->json(['ok' => 'ok']);
    }
    /**
     * PUT /api/content-types/:contentTypeName/reorder-fields.
     *
     * @param \Pike\Request $req
     * @param \Pike\Response $res
     * @param \RadCms\ContentType\ContentTypeRepository $repo
     * @param \RadCms\CmsState $cmsState
     * @throws \Pike\PikeException
     */
    public function handleUpdateOrderOfContentTypeFields(Request $req,
                                                         Response $res,
                                                         ContentTypeRepository $repo,
                                                         CmsState $cmsState): void {
        if (($errors = self::validateUpdateOrderInput($req->body))) {
            $res->status(400)->json($errors);
            return;
        }
        // @allow \Pike\PikeException
        $contentType = self::getContentTypeOrThrow($req->params->contentTypeName,
                                                   $cmsState);
        // @allow \Pike\PikeException
        $repo->updateFieldsOrder(array_map(function ($field) {
                                     return $field->name;
                                 }, $req->body->fields),
                                 $contentType);
        $res->json(['ok' => 'ok']);
    }
    /**
     * DELETE /api/content-types/:contentTypeName.
     *
     * @param \Pike\Request $req
     * @param \Pike\Response $res
     * @param \RadCms\ContentType\ContentTypeRepository $repo
     * @param \RadCms\CmsState $cmsState
     * @throws \Pike\PikeException
     */
    public function handleDeleteContentType(Request $req,
                                            Response $res,
                                            ContentTypeRepository $repo,
                                            CmsState $cmsState): void {
        // @allow \Pike\PikeException
        $contentType = self::getContentTypeOrThrow($req->params->contentTypeName,
                                                   $cmsState);
        // @allow \Pike\PikeException
        $repo->uninstallSingle($contentType);
        $res->json(['ok' => 'ok']);
    }
    /**
     * POST /api/content-types/field/:contentTypeName.
     *
     * @param \Pike\Request $req
     * @param \Pike\Response $res
     * @param \RadCms\ContentType\ContentTypeRepository $repo
     * @param \RadCms\CmsState $cmsState
     * @throws \Pike\PikeException
     */
    public function handleAddFieldToContentType(Request $req,
                                                Response $res,
                                                ContentTypeRepository $repo,
                                                CmsState $cmsState): void {
        if (($errors = $this->validateAddFieldInput($req->body))) {
            $res->status(400)->json($errors);
            return;
        }
        // @allow \Pike\PikeException
        $contentType = self::getContentTypeOrThrow($req->params->contentTypeName,
                                                   $cmsState);
        // @allow \Pike\PikeException
        $repo->addField(FieldDef::fromObject($req->body), $contentType);
        $res->json(['ok' => 'ok']);
    }
    /**
     * PUT /api/content-types/field/:contentTypeName/:fieldName.
     *
     * @param \Pike\Request $req
     * @param \Pike\Response $res
     * @param \RadCms\ContentType\ContentTypeRepository $repo
     * @param \RadCms\CmsState $cmsState
     * @throws \Pike\PikeException
     */
    public function handleUpdateFieldOfContentType(Request $req,
                                                   Response $res,
                                                   ContentTypeRepository $repo,
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
        $repo->updateField(FieldDef::fromObject($req->body),
                           $field,
                           $contentType);
        $res->json(['ok' => 'ok']);
    }
    /**
     * DELETE /api/content-types/field/:contentTypeName/:fieldName.
     *
     * @param \Pike\Request $req
     * @param \Pike\Response $res
     * @param \RadCms\ContentType\ContentTypeRepository $repo
     * @param \RadCms\CmsState $cmsState
     * @throws \Pike\PikeException
     */
    public function handleDeleteFieldFromContentType(Request $req,
                                                     Response $res,
                                                     ContentTypeRepository $repo,
                                                     CmsState $cmsState): void {
        // @allow \Pike\PikeException
        $contentType = self::getContentTypeOrThrow($req->params->contentTypeName,
                                                   $cmsState);
        // @allow \Pike\PikeException
        $field = self::getFieldOrThrow($req->params->fieldName, $contentType);
        // @allow \Pike\PikeException
        $repo->removeField($field, $contentType);
        $res->json(['ok' => 'ok']);
    }
    /**
     * @return string[]
     */
    private static function validateInsertInput(\stdClass $input): array {
        $v = self::makeValidatorWithCommonRules();
        $v = self::addFieldsValidatorRules($v, 'fields.*.');
        return $v->validate($input);
    }
    /**
     * @return string[]
     */
    private static function validateUpdateBasicInfoInput(\stdClass $input): array {
        return self::makeValidatorWithCommonRules()
            ->validate($input);
    }
    /**
     * @return string[]
     */
    private static function validateUpdateOrderInput(\stdClass $input): array {
        return (Validation::makeObjectValidator())
            ->rule('fields.*.name', 'identifier')
            ->validate($input);
    }
    /**
     * @return string[]
     */
    private static function validateAddFieldInput(\stdClass $input): array {
        $v = Validation::makeObjectValidator();
        $v = self::addFieldsValidatorRules($v);
        return $v->validate($input);
    }
    /**
     * @return \Pike\Validation\ObjectValidator
     */
    private static function makeValidatorWithCommonRules(): ObjectValidator {
        return (Validation::makeObjectValidator())
            ->rule('name', 'identifier')
            ->rule('name', 'maxLength', ContentTypeValidator::MAX_NAME_LEN)
            ->rule('friendlyName', 'minLength', 1)
            ->rule('friendlyName', 'maxLength', self::MAX_FRIENDLY_NAME_LENGTH)
            ->rule('description', 'maxLength', self::MAX_DESCRIPTION_LENGTH)
            ->rule('isInternal', 'type', 'bool');
    }
    /**
     * @return \Pike\ObjectValidator
     */
    private static function addFieldsValidatorRules(ObjectValidator $v,
                                                    string $keyPrefix = ''): ObjectValidator {
        return $v
            ->rule("{$keyPrefix}name", 'identifier')
            ->rule("{$keyPrefix}name", 'maxLength', ContentTypeValidator::MAX_NAME_LEN)
            ->rule("{$keyPrefix}friendlyName", 'minLength', 1)
            ->rule("{$keyPrefix}friendlyName", 'maxLength', self::MAX_FRIENDLY_NAME_LENGTH)
            ->rule("{$keyPrefix}dataType", 'in', ContentTypeValidator::FIELD_DATA_TYPES)
            ->rule("{$keyPrefix}defaultValue", 'maxLength', self::MAX_FIELD_DEFAULT_VALUE_LENGTH)
            ->rule("{$keyPrefix}visibility", 'type', 'int')
            ->rule("{$keyPrefix}widget.name", 'in', ContentTypeValidator::FIELD_WIDGETS)
            ->rule("{$keyPrefix}widget.args?", 'type', 'object');
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
