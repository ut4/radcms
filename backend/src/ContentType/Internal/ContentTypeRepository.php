<?php

declare(strict_types=1);

namespace RadCms\ContentType\Internal;

use Pike\{ArrayUtils, PikeException};
use RadCms\ContentType\{ContentTypeCollection, ContentTypeDef, ContentTypeMigrator,
                        FieldCollection, FieldDef};

/**
 * Luokka joka asentaa/päivittää/poistaa sisältötyyppejä ja sen sisältämiä
 * kenttiä tietokantaan.
 */
class ContentTypeRepository extends ContentTypeMigrator {
    /**
     * @param \RadCms\ContentType\ContentTypeDef $new
     * @param \RadCms\ContentType\ContentTypeDef $contentType
     * @param \RadCms\ContentType\ContentTypeCollection $currentContentTypes
     * @throws \Pike\PikeException
     */
    public function updateSingle(ContentTypeDef $new,
                                 ContentTypeDef $current,
                                 ContentTypeCollection $currentContentTypes): void {
        // @allow \Pike\PikeException
        $this->validateContentType($new, false);
        $this->validateContentType($current, false);
        //
        if ($new->name !== $current->name) {
            // @allow \Pike\PikeException
            $this->db->exec('RENAME TABLE `${p}' . $current->name .
                            '` TO `${p}' . $new->name . '`');
        }
        if ($new->name !== $current->name ||
            $new->friendlyName !== $current->friendlyName ||
            $new->description !== $current->description ||
            $new->isInternal !== $current->isInternal) {
            $idx = $current->index;
            $currentContentTypes[$idx]->name = $new->name;
            $currentContentTypes[$idx]->friendlyName = $new->friendlyName;
            $currentContentTypes[$idx]->description = $new->description;
            $currentContentTypes[$idx]->isInternal = $new->isInternal;
            // @allow \Pike\PikeException
            if ($this->db->exec(
                'UPDATE ${p}cmsState SET'.
                ' `installedContentTypes` = JSON_UNQUOTE(?)' .
                ', `installedContentTypesLastUpdated` = UNIX_TIMESTAMP()',
                [json_encode($currentContentTypes->toCompactForm())]) !== 1)
                throw new PikeException('Failed to rewrite cmsState.`installedContentTypes`',
                                        PikeException::INEFFECTUAL_DB_OP);
        }
    }
    /**
     * @param \RadCms\ContentType\FieldDef $field Olettaa, että validi
     * @param \RadCms\ContentType\ContentTypeDef $contentType
     * @throws \Pike\PikeException
     */
    public function addField(FieldDef $field, ContentTypeDef $contentType): void {
        // @allow \Pike\PikeException
        $this->validateContentType($contentType);
        // @allow \Pike\PikeException
        $this->db->exec('ALTER TABLE `${p}' . $contentType->name . '`' .
                        ' ADD COLUMN ' . $field->toSqlTableField());
        //
        $contentType->fields[] = $field;
        // @allow \Pike\PikeException
        $this->updateInstalledContenType($contentType);
    }
    /**
     * @param \RadCms\ContentType\FieldDef $newData
     * @param \RadCms\ContentType\FieldDef $currentField
     * @param \RadCms\ContentType\ContentTypeDef $contentType
     * @throws \Pike\PikeException
     */
    public function updateField(FieldDef $newData,
                                FieldDef $currentField,
                                ContentTypeDef $contentType): void {
        // @allow \Pike\PikeException
        $this->validateContentType($contentType);
        // @allow \Pike\PikeException
        if ($newData->name !== $currentField->name ||
            strval($newData->dataType) !== strval($currentField->dataType))
            $this->db->exec(
                'ALTER TABLE `${p}' . $contentType->name . '`' .
                (($newData->name === $currentField->name)
                    ? ' MODIFY ' . $newData->toSqlTableField()
                    : ' CHANGE `' . $currentField->name . '` ' .
                        $newData->toSqlTableField())
            );
        //
        $idx = ArrayUtils::findIndexByKey($contentType->fields,
                                          $currentField->name,
                                          'name');
        $contentType->fields[$idx] = $newData;
        // @allow \Pike\PikeException
        $this->updateInstalledContenType($contentType);
    }
    /**
     * @param \RadCms\ContentType\FieldDef $field Olettaa, että validi
     * @param \RadCms\ContentType\ContentTypeDef $contentType
     * @throws \Pike\PikeException
     */
    public function removeField(FieldDef $field, ContentTypeDef $contentType): void {
        // @allow \Pike\PikeException
        $this->validateContentType($contentType);
        // @allow \Pike\PikeException
        $this->db->exec('ALTER TABLE `${p}' . $contentType->name . '`' .
                        ' DROP COLUMN `' . $field->name . '`');
        //
        $idx = ArrayUtils::findIndexByKey($contentType->fields,
                                          $field->name,
                                          'name');
        $contentType->fields->offsetUnset($idx);
        // @allow \Pike\PikeException
        $this->updateInstalledContenType($contentType);
    }
    /**
     * @param string[] $orderedFieldNames
     * @param \RadCms\ContentType\ContentTypeDef $contentType
     * @throws \Pike\PikeException
     */
    public function updateFieldsOrder(array $orderedFieldNames,
                                      ContentTypeDef $contentType): void {
        $ordered = new FieldCollection();
        foreach ($orderedFieldNames as $name) {
            if (!($field = ArrayUtils::findByKey($contentType->fields, $name, 'name')))
                throw new PikeException('Field not found.', PikeException::BAD_INPUT);
            $ordered[] = $field;
        }
        $contentType->fields = $ordered;
        // @allow \Pike\PikeException
        $this->updateInstalledContenType($contentType);
    }
    /**
     * @param \RadCms\ContentType\ContentTypeDef $contentType
     * @throws \Pike\PikeException
     */
    private function updateInstalledContenType(ContentTypeDef $contentType): void {
        $compacted = $contentType->toCompactForm();
        // @allow \Pike\PikeException
        if ($this->db->exec(
            'UPDATE ${p}cmsState SET' .
            ' `installedContentTypes` = JSON_REPLACE(`installedContentTypes`' .
                                                    ', ?, CAST(? AS JSON))' .
            ', `installedContentTypesLastUpdated` = UNIX_TIMESTAMP()',
            ["\$[{$contentType->index}]", json_encode($compacted)]) !== 1)
            throw new PikeException('Failed to update cmsState.`installedContentTypes`',
                                    PikeException::INEFFECTUAL_DB_OP);
    }
}
