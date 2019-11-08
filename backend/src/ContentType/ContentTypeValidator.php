<?php

namespace RadCms\ContentType;

use RadCms\Framework\Validator;

abstract class ContentTypeValidator {
    const MAX_NAME_LEN = 64;
    const FIELD_WIDGETS = ['image'];
    /**
     * @param \RadCms\ContentType\ContentTypeDef $contentType
     * @return array Array<string>
     */
    public static function validate(ContentTypeDef $contentType) {
        $errors = self::validateName($contentType->name);
        //
        if (!count($contentType->fields)) {
            $errors[] = 'ContentType.fields must contain at least one field';
            return $errors;
        }
        foreach ($contentType->fields as $name => $f) {
            if (!is_string($name) || !preg_match('/^[a-zA-Z_]+$/', $name))
                $errors[] = "`{$name}` must contain only [a-zA-Z_]";
            if (!is_string($f->dataType) ||
                !in_array($f->dataType, ContentTypeMigrator::FIELD_DATA_TYPES))
                $errors[] = "`{$f->dataType}` is not valid data type";
            if (is_string($f->widget) &&
                !in_array($f->widget, self::FIELD_WIDGETS))
                $errors[] = "`{$f->widget}` is not valid widget";
        }
        return $errors;
    }
    /**
     * @param \RadCms\ContentType\ContentTypeCollection $contentTypes
     * @return array Array<string>
     */
    public static function validateAll(ContentTypeCollection $contentTypes) {
        return array_reduce($contentTypes->toArray(), function ($all, $def) {
            return array_merge($all, ContentTypeValidator::validate($def));
        }, []);
    }
    /**
     * @param string $contentTypeName
     * @return array Array<string>
     */
    public static function validateName($contentTypeName) {
        $errors = [];
        if (!ctype_alpha($contentTypeName) ||
            !ctype_upper(mb_substr($contentTypeName, 0, 1)))
            $errors[] = 'ContentType.name must be capitalized and contain only [a-ZA-Z]';
        if (mb_strlen($contentTypeName) > self::MAX_NAME_LEN)
            $errors[] = 'ContentType.name must be <= 64 chars long';
        return $errors;
    }
    /**
     * @param \RadCms\ContentType\ContentTypeDef $contentType
     * @param object $input
     * @return string[]
     */
    public static function validateInsertData(ContentTypeDef $contentType, $input) {
        $v = new Validator($input);
        foreach ($contentType->fields as $key => $f) {
            if (!$v->check($key, 'present'))
                continue;
            $validationRules = [
                'text' => ['string']
            ][$f->dataType];
            if (!$validationRules)
                throw new \RuntimeException('Shouldn\'t happen');
            $v->check($key, ...$validationRules);
        }
        return $v->errors;
    }
    /**
     * @param \RadCms\ContentType\ContentTypeDef $contentType
     * @param object $input
     * @return string[]
     */
    public static function validateUpdateData(ContentTypeDef $contentType, $input) {
        return self::validateInsertData($contentType, $input);
    }
}
