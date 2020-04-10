<?php

declare(strict_types=1);

namespace RadCms\ContentType;

use Pike\Validation;
use RadCms\Content\DAO;

abstract class ContentTypeValidator {
    const MAX_NAME_LEN = 64;
    const FIELD_WIDGETS = ['textField', 'textArea', 'richText', 'imagePicker',
                           'multiField', 'datePicker', 'dateTimePicker',
                           'colorPicker', 'contentSelector', 'hidden'];
    const FIELD_DATA_TYPES = ['text', 'json', 'int', 'uint'];
    const COLLECTION_SIZES = ['tiny', 'small', 'medium', '', 'big'];
    /**
     * @param \RadCms\ContentType\ContentTypeDef $contentType
     * @return string[]
     */
    public static function validate(ContentTypeDef $contentType): array {
        static $validator = null;
        if (!$validator) $validator = Validation::makeObjectValidator()
            ->rule('fields', 'minLength', 1)
            ->rule('fields.*.name', 'identifier')
            ->rule('fields.*.dataType', 'in', self::FIELD_DATA_TYPES)
            ->rule('fields.*.widget.name', 'in', self::FIELD_WIDGETS);
        return array_merge(
            self::validateName($contentType->name),
            $validator->validate($contentType)
        );
    }
    /**
     * @param \RadCms\ContentType\ContentTypeCollection $contentTypes
     * @return string[]
     */
    public static function validateAll(ContentTypeCollection $contentTypes): array {
        return array_reduce($contentTypes->getArrayCopy(), function ($all, $def) {
            return array_merge($all, ContentTypeValidator::validate($def));
        }, []);
    }
    /**
     * @param string $contentTypeName
     * @return string[]
     */
    public static function validateName(string $contentTypeName): array {
        return (Validation::makeValueValidator())
            ->rule('identifier')
            ->rule('maxLength', self::MAX_NAME_LEN)
            ->validate($contentTypeName, 'ContentType.name');
    }
    /**
     * @param \RadCms\ContentType\ContentTypeDef $contentType
     * @param \stdClass $input
     * @param \Closure $additionalChecks = null
     * @return string[]
     */
    public static function validateInsertData(ContentTypeDef $contentType,
                                              \stdClass $input,
                                              \Closure $additionalChecks = null): array {
        $v = Validation::makeObjectValidator();
        $v->rule('id?', 'type', 'string');
        $v->rule('status?', 'max', DAO::STATUS_DRAFT);
        if ($additionalChecks) $additionalChecks($v);
        foreach ($contentType->fields as $f) {
            $rules = [
                'text' => [['type', 'string']],
                'json' => [['type', 'string']],
                'int' => [['type', 'int']],
                'uint' => [['type', 'int'], ['min', 0]],
            ][$f->dataType] ?? null;
            if (!$rules)
                throw new \RuntimeException('Shouldn\'t happen');
            foreach ($rules as $ruleArgs)
                $v->rule("{$f->name}?", ...$ruleArgs);
        }
        if (!($errors = $v->validate($input))) {
            $input->status = $input->status ?? DAO::STATUS_PUBLISHED;
        }
        return $errors;
    }
    /**
     * @param \RadCms\ContentType\ContentTypeDef $contentType
     * @param \stdClass $input
     * @return string[]
     */
    public static function validateUpdateData(ContentTypeDef $contentType,
                                              \stdClass $input): array {
        return self::validateInsertData($contentType, $input, function ($v) {
            $v->rule('isRevision', 'type', 'bool');
        });
    }
}
