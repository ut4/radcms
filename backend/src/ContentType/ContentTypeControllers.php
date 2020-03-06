<?php

namespace RadCms\ContentType;

use Pike\Request;
use Pike\Response;
use Pike\Validation;
use Pike\ArrayUtils;
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
                                            ContentTypeMigrator $migrator) {
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
                                         CmsState $cmsState) {
        $ctype = ArrayUtils::findByKey($cmsState->getContentTypes(),
                                       $req->params->name,
                                       'name');
        if ($ctype) $res->json($ctype);
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
                                          CmsState $cmsState) {
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
     * @param \RadCms\CmaState $cmsState
     * @throws \Pike\PikeException
     */
    public function handleUpdateContentType(Request $req,
                                            Response $res,
                                            ContentTypeMigrator $migrator,
                                            CmsState $cmsState) {
        if (($errors = $this->validateUpdateInput($req->body))) {
            $res->status(400)->json($errors);
            return;
        }
        if (!($contentType = ArrayUtils::findByKey($cmsState->getContentTypes(),
                                                   $req->params->contentTypeName,
                                                   'name')))
            throw new PikeException('Content type not found.', PikeException::BAD_INPUT);
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
     * POST /api/content-types/field/:contentTypeName.
     *
     * @param \Pike\Request $req
     * @param \Pike\Response $res
     * @param \RadCms\ContentType\ContentTypeMigrator $migrator
     * @param \RadCms\CmaState $cmsState
     * @throws \Pike\PikeException
     */
    public function handleAddFieldToContentType(Request $req,
                                                Response $res,
                                                ContentTypeMigrator $migrator,
                                                CmsState $cmsState) {
        if (($errors = $this->validateAddFieldInput($req->body))) {
            $res->status(400)->json($errors);
            return;
        }
        if (!($contentType = ArrayUtils::findByKey($cmsState->getContentTypes(),
                                                   $req->params->contentTypeName,
                                                   'name')))
            throw new PikeException('Content type not found.', PikeException::BAD_INPUT);
        // @allow \Pike\PikeException
        $migrator->addField(FieldDef::fromObject($req->body), $contentType);
        $res->json(['ok' => 'ok']);
    }
    /**
     * DELETE /api/content-types/field/:contentTypeName/:fieldName.
     *
     * @param \Pike\Request $req
     * @param \Pike\Response $res
     * @param \RadCms\ContentType\ContentTypeMigrator $migrator
     * @param \RadCms\CmaState $cmsState
     * @throws \Pike\PikeException
     */
    public function handleDeleteFieldFromContentType(Request $req,
                                                     Response $res,
                                                     ContentTypeMigrator $migrator,
                                                     CmsState $cmsState) {
        if (!($contentType = ArrayUtils::findByKey($cmsState->getContentTypes(),
                                                   $req->params->contentTypeName,
                                                   'name')))
            throw new PikeException('Content type not found.', PikeException::BAD_INPUT);
        if (!($field = ArrayUtils::findByKey($contentType->fields,
                                             $req->params->fieldName,
                                             'name')))
            throw new PikeException('Field not found.', PikeException::BAD_INPUT);
        // @allow \Pike\PikeException
        $migrator->removeField($field, $contentType);
        $res->json(['ok' => 'ok']);
    }
    /**
     * @return string[]
     */
    private static function validateInsertInput($input) {
        return self::getBaseValidationRules()
            ->rule('fields.*.name', 'identifier')
            ->rule('fields.*.friendlyName', 'minLength', 1)
            ->rule('fields.*.dataType', 'in', ContentTypeValidator::FIELD_DATA_TYPES)
            ->rule('fields.*.defaultValue', 'type', 'string')
            ->rule('fields.*.widget.name', 'in', ContentTypeValidator::FIELD_WIDGETS)
            ->rule('fields.*.widget.args?', 'type', 'object')
            ->validate($input);
    }
    /**
     * @return string[]
     */
    private static function validateUpdateInput($input) {
        return self::getBaseValidationRules()
            ->validate($input);
    }
    /**
     * @return string[]
     */
    private static function validateAddFieldInput($input) {
        return (Validation::makeObjectValidator())
            ->rule('name', 'identifier')
            ->rule('friendlyName', 'minLength', 1)
            ->rule('dataType', 'in', ContentTypeValidator::FIELD_DATA_TYPES)
            ->rule('defaultValue', 'type', 'string')
            ->rule('widget.name', 'in', ContentTypeValidator::FIELD_WIDGETS)
            ->rule('widget.args?', 'type', 'object')
            ->validate($input);
    }
    /**
     * @return \Pike\Validation\ObjectValidator
     */
    private static function getBaseValidationRules() {
        return (Validation::makeObjectValidator())
            ->rule('name', 'identifier')
            ->rule('name', 'maxLength', ContentTypeValidator::MAX_NAME_LEN)
            ->rule('friendlyName', 'type', 'string')
            ->rule('friendlyName', 'minLength', 1)
            ->rule('isInternal', 'type', 'bool');
    }
}
