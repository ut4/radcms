<?php

declare(strict_types=1);

namespace RadCms\ContentType;

final class ContentTypeCollectionBuilder {
    /** @var \RadCms\ContentType\ContentTypeCollection */
    private $types;
    /** @var ?\RadCms\ContentType\ContentTypeDef */
    private $currentType;
    /**
     * @param \RadCms\ContentType\ContentTypeCollection $initial = null
     */
    public function __construct(ContentTypeCollection $initial = null) {
        $this->types = $initial ?? new ContentTypeCollection();
    }
    /**
     * @param string $name
     * @param string $friendlyName
     * @return $this
     */
    public function add(string $name, string $friendlyName) {
        $this->types[] = new ContentTypeDef($name,
                                            $friendlyName,
                                            '(description)',
                                            new FieldCollection,
                                            count($this->types));
        $this->currentType = $this->types[count($this->types) - 1];
        return $this;
    }
    /**
     * @param string $fieldName
     * @param string $fieldFriendlyName = ''
     * @return \RadCms\ContentType\FieldCollectionBuilder
     */
    public function field(string $fieldName,
                          string $fieldFriendlyName = ''): FieldCollectionBuilder {
        return new FieldCollectionBuilder($fieldName, $fieldFriendlyName, $this);
    }
    /**
     * @param string $description
     * @return $this
     */
    public function description(string $description): ContentTypeCollectionBuilder {
        $this->currentType->description = $description;
        return $this;
    }
    /**
     * @param bool $isInternal
     * @return $this
     */
    public function isInternal(bool $isInternal): ContentTypeCollectionBuilder {
        $this->currentType->isInternal = $isInternal;
        return $this;
    }
    /**
     * @param string $implName
     * @return \RadCms\ContentType\FieldCollectionBuilder
     */
    public function frontendFormImpl(string $implName): ContentTypeCollectionBuilder {
        $this->currentType->frontendFormImpl = $implName;
        return $this;
    }
    /**
     * @return \RadCms\ContentType\ContentTypeCollection
     */
    public function done(): ContentTypeCollection {
        return $this->types;
    }
    /**
     * @return \RadCms\ContentType\ContentTypeDef
     */
    public function getCurrentType(): ContentTypeDef {
        return $this->currentType;
    }
}

final class FieldCollectionBuilder {
    /** @var \RadCms\ContentType\ContentTypeCollectionBuilder */
    private $typeBuilder;
    /** @var ?\RadCms\ContentType\FieldDef */
    private $currentField;
    /**
     * @param string $name
     * @param string $friendlyName
     * @param \RadCms\ContentType\ContentTypeCollectionBuilder
     */
    public function __construct(string $name,
                                string $friendlyName,
                                ContentTypeCollectionBuilder $typeBuilder) {
        $this->typeBuilder = $typeBuilder;
        $this->field($name, $friendlyName);
    }
    /**
     * @param string $name
     * @param string $friendlyName = ''
     * @return $this
     */
    public function field(string $name, string $friendlyName = ''): FieldCollectionBuilder {
        $fields = $this->typeBuilder->getCurrentType()->fields;
        $fields[] = new FieldDef($name, $friendlyName);
        $this->currentField = $fields[count($fields) - 1];
        return $this;
    }
    /**
     * @param string $dataType 'text'|'json'|'int'|'uint'
     * @param ?int $length = null
     * @return $this
     */
    public function dataType(string $dataType, ?int $length = null): FieldCollectionBuilder {
        $this->currentField->dataType = new DataType($dataType, $length);
        return $this;
    }
    /**
     * @param string $name 'textField'|'textArea'|'richText'|'imagePicker'|'multiField'|'datePicker'|'dateTimePicker'|'colorPicker'|'contentSelector'|'hidden'
     * @param ?object $args = null
     * @return $this
     */
    public function widget(string $name, ?object $args = null): FieldCollectionBuilder {
        $this->currentField->widget = (object) ['name' => $name,
                                                'args' => $args];
        return $this;
    }
    /**
     * @param string $value
     * @return $this
     */
    public function defaultValue(string $value): FieldCollectionBuilder {
        $this->currentField->defaultValue = $value;
        return $this;
    }
    /**
     * @param int $visibility 0 = all, ALC::ROLE_FOO = only foo, ACL::ROLE_FOO|ACL::ROLE_BAR = only foo and bar
     * @return $this
     */
    public function visibility(int $visibility): FieldCollectionBuilder {
        $this->currentField->visibility = $visibility;
        return $this;
    }
    /**
     * @param string $ruleName 'type'|'minLength'|'maxLength'| 'min'|'max'|'in'|'identifier'|'regexp'
     * @return $this
     */
    public function validationRule(string $ruleName, ...$args): FieldCollectionBuilder {
        $this->currentField->validationRules[] = [$ruleName, ...$args];
        return $this;
    }
    /**
     * @param string $contentTypeName
     * @param string $contentTypeFriendlyName
     * @return \RadCms\ContentType\ContentTypeCollectionBuilder
     */
    public function add(string $contentTypeName,
                        string $contentTypeFriendlyName): ContentTypeCollectionBuilder {
        return $this->typeBuilder->add($contentTypeName, $contentTypeFriendlyName);
    }
    /**
     * @return \RadCms\ContentType\ContentTypeCollection
     */
    public function done(): ContentTypeCollection {
        return $this->typeBuilder->done();
    }
}
