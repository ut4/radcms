<?php

declare(strict_types=1);

namespace RadCms\ContentType;

use Pike\{ArrayUtils, PikeException, Request, Response, Validation};
use RadCms\CmsState;
use RadCms\ContentType\Internal\ContentTypeRepository;

/**
 * Handlaa /api/content-types -alkuiset pyynnöt.
 */
class ContentTypeControllers {
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
        $res->json($contentType);
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
        // @allow \Pike\PikeException
        $contentType = self::getContentTypeOrThrow($req->params->contentTypeName,
                                                   $cmsState);
        // @allow \Pike\PikeException
        $repo->updateSingle(ContentTypeDef::fromObject($req->body),
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
    private static function validateUpdateOrderInput(\stdClass $input): array {
        return (Validation::makeObjectValidator())
            ->rule('fields.*.name', 'identifier')
            ->validate($input);
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
