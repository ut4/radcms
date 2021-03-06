import {http, env, hookForm, InputGroup, Select} from '@rad-commons';
import AbstractSettingEditForm from '../AbstractSettingEditForm.jsx';
import ContentTypeDropdown from '../../../ContentType/ContentTypeDropdown.jsx';

/**
 * Komponentti, jolla devaaja voi konfiguroida sisältövalitsimen asetukset (eli
 * minkä sisältötyypin sisältöä sillä halutaan valita).
 */
class ContentSelectorSettingsEditForm extends AbstractSettingEditForm {
    /**
     * @param {{settings: {contentType: string; labelField: string; valueField: string;}|null;}} props
     */
    constructor(props) {
        super(props);
        this.state = {contentTypes: null, enableMultipleSelections: null};
        this.inputIds = {
            contentType: 'contentSelectorSetting-contentType',
            labelField: 'contentSelectorSetting-labelField',
            valueField: 'contentSelectorSetting-valueField',
        };
        http.get('/api/content-types')
            .then(contentTypes => {
                const settings = props.settings
                    ? props.settings
                    : makeDefaultSettings(contentTypes[0]);
                this.setState(Object.assign({
                    contentTypes,
                    enableMultipleSelections: !settings.enableMultipleSelections ? 'no' : 'yes'
                }, hookForm(this, {
                    [this.inputIds.contentType]: settings.contentType,
                    [this.inputIds.labelField]: settings.labelField,
                    [this.inputIds.valueField]: settings.valueField,
                })));
            })
            .catch(err => {
                env.console.error(err);
            });
    }
    /**
     * @returns {{contentType: string; enableMultipleSelections: boolean; labelField: string; valueField: string;}}
     * @access public
     */
    getResult() {
        const {values} = this.state;
        return {contentType: values[this.inputIds.contentType],
                enableMultipleSelections: this.state.enableMultipleSelections === 'yes',
                labelField: values[this.inputIds.labelField],
                valueField: values[this.inputIds.valueField]};
    }
    /**
     * @access protected
     */
    render() {
        if (!this.state.contentTypes)
            return null;
        const contentTypeName = this.state.values[this.inputIds.contentType];
        const contentTypeFields = this.state.contentTypes.find(t => t.name === contentTypeName).fields;
        return <>
            <InputGroup>
                <label htmlFor={ this.inputIds.contentType } class="form-label">Sisältötyyppi</label>
                <ContentTypeDropdown
                    initialValue={ contentTypeName }
                    contentTypes={ this.state.contentTypes }
                    onSelected={ type => {
                        const settings = makeDefaultSettings(this.state.contentTypes.find(t => t.name === type.name));
                        this.form.triggerChange(settings.contentType, this.inputIds.contentType);
                        this.form.triggerChange(settings.labelField, this.inputIds.labelField);
                        this.form.triggerChange(settings.valueField, this.inputIds.valueField);
                    } }/>
            </InputGroup>
            <InputGroup>
                <label class="form-label">Käytä monivalintaa</label>
                <label class="form-radio">
                    <input onChange={ e => this.setState({enableMultipleSelections: e.target.value}) } checked={ this.state.enableMultipleSelections === 'no' } value="no" type="radio"/>
                    <i class="form-icon"></i>Ei <span class="note">(esim. kategoria)</span>
                </label>
                <label class="form-radio">
                    <input onChange={ e => this.setState({enableMultipleSelections: e.target.value}) } checked={ this.state.enableMultipleSelections === 'yes' } value="yes" type="radio"/>
                    <i class="form-icon"></i>Kyllä <span class="note">(esim. tagit)</span>
                </label>
            </InputGroup>
            <InputGroup>
                <label htmlFor={ this.inputIds.labelField } class="form-label">Nimikekenttä
                    <div class="note">Kenttä joka näytetään alasvetovalikossa käyttäjälle</div>
                </label>
                <Select vm={ this } name={ this.inputIds.labelField }
                    id={ this.inputIds.labelField }>{ contentTypeFields.map(f =>
                    <option value={ f.name }>{ f.friendlyName }</option>
                ) }</Select>
            </InputGroup>
            <InputGroup>
                <label htmlFor={ this.inputIds.valueField } class="form-label">Arvokenttä
                    <div class="note">Kenttä jota käytetään valinnan arvona</div>
                </label>
                <Select vm={ this } name={ this.inputIds.valueField }
                    id={ this.inputIds.valueField }>{ [{name: 'id', friendlyName: 'ID'}].concat(contentTypeFields).map(f =>
                    <option value={ f.name }>{ f.friendlyName }</option>
                ) }</Select>
            </InputGroup>
        </>;
    }
}

function makeDefaultSettings(contentType) {
    return {contentType: contentType.name,
            enableMultipleSelections: false,
            labelField: contentType.fields[0].name,
            valueField: 'id'};
}

export default ContentSelectorSettingsEditForm;
