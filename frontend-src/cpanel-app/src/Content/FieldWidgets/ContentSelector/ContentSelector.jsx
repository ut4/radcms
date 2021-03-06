import {http, InputGroup, Confirmation} from '@rad-commons';
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
        this.initialOptions = null;
        this.contentTypeName = props.field.widget.args.contentType;
        this.state = {contentFetched: false};
    }
    /**
     * @param {Object} filters
     * @returns {Promise<Array<{label: string; value: string;}>>}
     * @access public
     */
    reFetchContent(filters) {
        return http.get(`/api/content/${this.contentTypeName}/${makeFiltersJson(filters)}`)
            .then(this.toOptions.bind(this))
            .catch(err => {
                window.console.error(err);
            });
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
        let contentNodes;
        http.get(`/api/content/${this.contentTypeName}/${makeFiltersJson(null)}`)
            .then(initialNodes => {
                // @allow Error
                this.validateFieldNames(initialNodes);
                contentNodes = initialNodes;
                return this.fetchMissing(initialNodes);
            })
            .then(nodesMissingFromInitialResult => {
                if (nodesMissingFromInitialResult) {
                    // @allow Error
                    this.validateFieldNames(nodesMissingFromInitialResult);
                    contentNodes = nodesMissingFromInitialResult.concat(contentNodes);
                }
                this.initialOptions = this.toOptions(contentNodes);
                this.setState({contentFetched: true});
            })
            .catch(err => {
                window.console.error(err);
            });
    }
    /**
     * @access protected
     */
    render() {
        if (!this.state.contentFetched)
            return;
        if (!this.enableMultipleSelections)
            return <SingleFieldValueSelector
                options={ this.initialOptions }
                label={ this.label }
                initialValue={ this.fixedInitialValue }
                onValueChange={ this.props.onValueChange }
                root={ this }/>;
        return <FieldValueListSelector
            options={ this.initialOptions }
            root={ this }/>;
    }
    /**
     * @access private
     */
    fetchMissing(initialOptions) {
        const atLeastThese = !this.props.field.widget.args.enableMultipleSelections
            ? this.fixedInitialValue !== NO_SELECTION ? [this.fixedInitialValue] : []
            : JSON.parse(this.fixedInitialValue);
        const needsToBeFetched = atLeastThese.filter(value => {
            return !initialOptions.some(n => n[this.valueField] === value);
        });
        return needsToBeFetched.length
            ? http.get(`/api/content/${this.contentTypeName}/${makeFiltersJson({id:{$in:needsToBeFetched}})}`)
            : null;
    }
    /**
     * @access private
     */
    validateFieldNames(contentNodes) {
        if (contentNodes.length) {
            [this.valueField, this.labelField].forEach((field, i) => {
                if (!contentNodes[0][field])
                    throw new Error(`${!i?'Value':'Label'}field ${this.contentTypeName}.${field} doesn't exist`);
            });
        }
    }
    /**
     * @access private
     */
    toOptions(contentNodes) {
        return contentNodes.map(cnode =>
            ({value: cnode[this.valueField],
              label: cnode[this.labelField]})
        );
    }
}

/**
 * ContentSelector-widgetin alikomponentti, jolla voi valita yhden sisältö-
 * noden. Käytetään silloin kun (args.enableMultipleSelections === false).
 */
class SingleFieldValueSelector extends preact.Component {
    /**
     * @param {{initialValue: any; options: Array<Object>; onValueChange?: (val: string): any; root: ContentSelectorFieldWidget;}} props
     */
    constructor(props) {
        super(props);
        this.inputEl = preact.createRef();
        this.selectEl = preact.createRef();
        this.state = {options: props.options.slice(0),
                      showOptions: false,
                      searchTerm: (props.options.find(o => o.value === props.initialValue) || {}).label,
                      committedVal: props.initialValue};
    }
    /**
     * @returns {string}
     * @access public
     */
    getSelection() {
        return this.state.committedVal;
    }
    /**
     * @returns {Array<{label: string; value: string;}>}
     * @access public
     */
    getCurrentOptions() {
        return this.state.options;
    }
    /**
     * @access protected
     */
    componentDidMount() {
        this.handleEnter = e => {
            if (this.state.showOptions && e.keyCode == 13) {
                e.preventDefault();
                this.setState({showOptions: false});
                return false;
            }
        };
        window.addEventListener('keydown', this.handleEnter);
        this.searchResultCache = new Map();
        this.searchResultCache.set('', this.props.options);
    }
    /**
     * @access protected
     */
    componentWillUnmount() {
        window.removeEventListener('keydown', this.handleEnter);
    }
    /**
     * @access protected
     */
    render(_, {options, showOptions, searchTerm, committedVal}) {
        return <div class={ `cc form-input${!showOptions ? '' : ' open'}` }>
            <input
                value={ searchTerm }
                class="form-input"
                onInput={ e => this.onSearchTermTyped(e.target.value) }
                onClick={ () => {
                    if (!showOptions) this.setState({showOptions: true});
                } }
                onKeyUp={ e => {
                    if (e.keyCode === 40 || e.keyCode === 38) { // down, up
                        this.setState({showOptions: true});
                        if (this.state.showOptions) e.target.nextElementSibling.focus();
                    }
                }}
                onBlur={ e => {
                    if (showOptions && e.relatedTarget !== this.selectEl.current)
                        this.setState({showOptions: false});
                } }
                ref={ this.inputEl }/>
            { showOptions ? options.length
                ? <select
                    value={ committedVal }
                    size={ options.length }
                    onChange={ e => this.applySelection(e.target.value, true) }
                    onClick={ e => this.applySelection(e.target.value, false) }
                    class="form-input form-select"
                    onKeyDown={ e => {
                        if (e.keyCode === 27) { // esc
                            this.setState({showOptions: false});
                        }
                    }}
                    ref={ this.selectEl }>{ options.map(({value, label}) =>
                        <option value={ value }>{ label }</option>
                    ) }</select>
                : <p class="mx-2 mt-2 mb-1">Ei hakutuloksia.</p> : null
            }
          </div>;
    }
    /**
     * @access private
     */
    onSearchTermTyped(searchTerm) {
        // Note: ''-avain sisältää props.optionsit, ks. componentDidMount()
        if (this.searchResultCache.has(searchTerm)) {
            this.setState(Object.assign(this.makeOptionsState(searchTerm), {searchTerm}));
            return;
        }
        this.setState({searchTerm});
        this.props.root.reFetchContent({name: {$startsWith: searchTerm}})
            .then(options => {
                this.searchResultCache.set(searchTerm, options);
                this.setState(this.makeOptionsState(searchTerm));
            });
    }
    /**
     * @access private
     */
    makeOptionsState(searchTerm) {
        return {options: this.searchResultCache.get(searchTerm),
                showOptions: true,};
    }
    /**
     * @access private
     */
    applySelection(val, keepOptionsVisible) {
        this.setState({searchTerm: this.state.options.find(o => o.value === val).label,
                       showOptions: keepOptionsVisible,
                       committedVal: val});
        if (this.props.onValueChange)
            this.props.onValueChange(val);
    }
}

/**
 * ContentSelector-widgetin alikomponentti, jolla voi valita useita sisäl-
 * tönodeja. Käytetään silloin kun (args.enableMultipleSelections === true).
 */
class FieldValueListSelector extends preact.Component {
    /**
     * @param {{root: ContentSelectorFieldWidget; options: Array<Object>; onValueChange?: (val: string): any;}} props
     */
    constructor(props) {
        super(props);
        this.validateOptions(props.options);
        this.state = {addTagModalIsOpen: false};
        this.selectedContent = JSON.parse(props.root.fixedInitialValue);
        this.tagsWidget = preact.createRef();
        this.singleFieldSelector = preact.createRef();
    }
    /**
     * @access protected
     */
    render({options}, {addTagModalIsOpen}) {
        return <>
            <Tags
                tags={ this.selectedContent.map(fieldValue => this.getFieldLabelByValue(fieldValue)).filter(v => v !== null) }
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
                        <InputGroup>
                        <label class="form-label">Sisältö</label>
                        <SingleFieldValueSelector
                            options={ options }
                            initialValue={ options.length ? options[0].value : NO_SELECTION }
                            ref={ this.singleFieldSelector }
                            root={ this.props.root }/>
                        </InputGroup>
                    </div>
                </Confirmation></div></div>
                : null }
        </>;
    }
    /**
     * @access private
     */
    getFieldLabelByValue(valueToFind) {
        return this.props.options.concat(this.singleFieldSelector.current
            ? this.singleFieldSelector.current.getCurrentOptions()
            : null).find(({value}) => value === valueToFind).label;
    }
    /**
     * @access private
     */
    confirmAddContentToList() {
        const selectedFieldValue = this.singleFieldSelector.current.getSelection();
        if (selectedFieldValue !== NO_SELECTION) {
            this.selectedContent.push(selectedFieldValue);
            this.tagsWidget.current.addTag(this.getFieldLabelByValue(selectedFieldValue));
            this.props.root.props.onValueChange(JSON.stringify(this.selectedContent));
        }
        this.closeAddContentDialog();
    }
    /**
     * @access private
     */
    removeContentFromListByLabel(label) {
        const fieldValueToRemove = this.props.options.find(o => o.label === label).value;
        this.selectedContent = this.selectedContent.filter(fieldValue => fieldValue !== fieldValueToRemove);
        this.props.root.props.onValueChange(JSON.stringify(this.selectedContent));
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

function makeFiltersJson(filters) {
    return JSON.stringify(Object.assign({$limit: 10}, filters));
}

export default ContentSelectorFieldWidget;
