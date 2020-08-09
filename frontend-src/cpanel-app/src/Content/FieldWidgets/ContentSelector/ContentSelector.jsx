import {http, hookForm, InputGroup, Select, Confirmation} from '@rad-commons';
import Tags from '../../../Common/Tags.jsx';
import BaseFieldWidget from '../Base.jsx';
const NO_SELECTION = '0';

/**
 * Widgetti, jolla voi valita muuta CMS:ään luotua sisältöä alasvetovalikosta /
 * tagi-widgetistä. Argumenttien "contentType" määrittelee widgettiin listattavan
 * sisällön tyypin, "labelField" kentän, joka näytetään alasvetovalikossa käyttäjälle,
 * ja "valueField" kentän, jota käytetään valinnan arvona.
 */
class ContentSelectorFieldWidget extends BaseFieldWidget {
    /**
     * @inheritdoc
     */
    constructor(props) {
        super(props);
        const widget = props.field.widget;
        ['contentType', 'enableMultipleSelections', 'valueField', 'labelField'].forEach(key => {
            if (!widget.args || widget.args[key] === undefined)
                throw new Error(`contentSelector.args.${key} is required`);
        });
        this.enableMultipleSelections = widget.args.enableMultipleSelections;
        this.valueField = widget.args.valueField;
        this.labelField = widget.args.labelField;
        this.state = {options: null};
    }
    /**
     * @returns {string}
     * @access protected
     */
    getInitialValue() {
        return !this.props.field.widget.args.enableMultipleSelections
            ? NO_SELECTION
            : '[]';
    }
    /**
     * @access protected
     */
    componentWillMount() {
        const contentTypeName = this.props.field.widget.args.contentType;
        http.get(`/api/content/${contentTypeName}`)
            .then(contentNodes => {
                // @allow Error
                this.validateFieldNames(contentNodes, contentTypeName);
                this.setState({options: contentNodes.map(cnode =>
                                  ({value: cnode[this.valueField],
                                    label: cnode[this.labelField]})
                               )});
            })
            .catch(err => {
                window.console.error(err);
            });
    }
    /**
     * @access protected
     */
    render() {
        if (!this.state.options)
            return;
        if (!this.enableMultipleSelections)
            return <SingleFieldValueSelector
                options={ this.state.options }
                label={ this.label }
                initialValue={ this.fixedInitialValue }
                onValueChange={ this.props.onValueChange }/>;
        return <FieldValueListSelector options={ this.state.options } parent={ this }/>;
    }
    /**
     * @access private
     */
    validateFieldNames(contentNodes, contentTypeName) {
        if (contentNodes.length) {
            [this.valueField, this.labelField].forEach((field, i) => {
                if (!contentNodes[0][field])
                    throw new Error(`${!i?'Value':'Label'}field ${contentTypeName}.${field} doesn't exist`);
            });
        }
    }
}

let counter = 0;
/**
 * ContentSelector-widgetin alikomponentti, jolla voi valita yhden sisältö-
 * noden. Käytetään silloin kun (args.enableMultipleSelections === false).
 */
class SingleFieldValueSelector extends preact.Component {
    /**
     * @param {{initialValue: any; options: Array<Object>; onValueChange?: Function;}} props
     */
    constructor(props) {
        super(props);
        this.fieldName = `field-selector-field-${++counter}`;
        this.state = hookForm(this, {[this.fieldName]: props.initialValue});
    }
    /**
     * @access protected
     */
    render({label}) {
        return <InputGroup classes={ this.state.classes[this.fieldName] }>
            <label htmlFor={ this.fieldName } class="form-label">{ label }</label>
            <Select vm={ this } name={ this.fieldName } id={ this.fieldName }
                    myOnChange={ newState => this.receiveSelection(newState) }>
                <option value={ NO_SELECTION }> - </option>
                { this.props.options.map(({value, label}) =>
                    <option value={ value }>{ label }</option>
                ) }
            </Select>
        </InputGroup>;
    }
    /**
     * @access private
     */
    receiveSelection(newState) {
        if (this.props.onValueChange)
            this.props.onValueChange(newState.values[this.fieldName]);
        return newState;
    }
    /**
     * @access private
     */
    getSelection() {
        return this.state.values[this.fieldName];
    }
}

/**
 * ContentSelector-widgetin alikomponentti, jolla voi valita useita sisäl-
 * tönodeja. Käytetään silloin kun (args.enableMultipleSelections === true).
 */
class FieldValueListSelector extends preact.Component {
    /**
     * @param {{parent: ContentSelectorFieldWidget; options: Array<Object>; onValueChange?: Function;}} props
     */
    constructor(props) {
        super(props);
        this.validateOptions(props.options);
        this.label = props.parent.label;
        this.state = {addTagModalIsOpen: false};
        this.selectedContent = JSON.parse(props.parent.fixedInitialValue);
        this.tagsWidget = preact.createRef();
        this.singleFieldSelector = preact.createRef();
    }
    /**
     * @access protected
     */
    render({options}, {addTagModalIsOpen}) {
        return <InputGroup>
            <label class="form-label">{ this.label }</label>
            <Tags
                tags={ this.selectedContent.map(fieldValue => this.getFieldLabelByValue(fieldValue)) }
                onAddTagButtonClicked={ () => this.setState({addTagModalIsOpen: true}) }
                onTagRemoved={ fieldLabel => this.removeContentFromListByLabel(fieldLabel) }
                ref={ this.tagsWidget }/>
            { addTagModalIsOpen
                ? <div class="popup-dialog"><div class="box">
                    <Confirmation onConfirm={ () => this.confirmAddContentToList() }
                        confirmButtonText="Lisää"
                        onCancel={ () => this.closeAddContentDialog() }>
                    <h2>Valitse sisältö</h2>
                    <div class="main">
                        <SingleFieldValueSelector
                            options={ options }
                            label="Sisältö"
                            initialValue={ options.length ? options[0].value : NO_SELECTION }
                            ref={ this.singleFieldSelector }/>
                    </div>
                </Confirmation></div></div>
                : null }
        </InputGroup>;
    }
    /**
     * @access private
     */
    getFieldLabelByValue(valueToFind) {
        return this.props.options.find(({value}) => value === valueToFind).label;
    }
    /**
     * @access private
     */
    confirmAddContentToList() {
        const selectedFieldValue = this.singleFieldSelector.current.getSelection();
        if (selectedFieldValue !== NO_SELECTION) {
            this.selectedContent.push(selectedFieldValue);
            this.tagsWidget.current.addTag(this.getFieldLabelByValue(selectedFieldValue));
            this.props.parent.props.onValueChange(JSON.stringify(this.selectedContent));
        }
        this.closeAddContentDialog();
    }
    /**
     * @access private
     */
    removeContentFromListByLabel(label) {
        const fieldValueToRemove = this.props.options.find(o => o.label === label).value;
        this.selectedContent = this.selectedContent.filter(fieldValue => fieldValue !== fieldValueToRemove);
        this.props.parent.props.onValueChange(JSON.stringify(this.selectedContent));
    }
    /**
     * @access private
     */
    closeAddContentDialog() {
        this.setState({addTagModalIsOpen: false});
    }
    /**
     * @access private
     */
    validateOptions(options) {
        options.forEach((o1, i1) => {
            if (options.find((o2, i2) => i1 !== i2 && o1.value === o2.value && o1.field === o2.field))
                throw new Error(`Found duplicate pair ${JSON.stringify(o1)}`);
        });
    }
}

export default ContentSelectorFieldWidget;
