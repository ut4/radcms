import {hookForm, Input, FeatherSvg} from '@rad-commons';
import popupDialog from '../../Common/PopupDialog.jsx';
import UploadsManager from '../../Upload/UploadsManager.jsx';
import BaseFieldWidget from './Base.jsx';

/**
 * Widgetti, jolla voi valita uploads-kansioon ladattuja kuvia, ja ladata niitä
 * sinne lisää.
 */
class ImagePickerFieldWidget extends BaseFieldWidget {
    /**
     * @inheritdoc
     */
    constructor(props) {
        super(props);
        this.fieldName = props.field.name;
        this.state = hookForm(this, {[this.fieldName]: props.initialValue});
        this.inputElWrap = preact.createRef();
    }
    /**
     * @inheritdoc
     */
    static getInitialValue() {
        return '';
    }
    /**
     * @inheritdoc
     */
    static convert(previous, _newWidget, value) {
        return previous.name !== 'imagePicker'
            ? ImagePickerFieldWidget.getInitialValue()
            : value;
    }
    /**
     * @access protected
     */
    render(_, {values}) {
        const input = <Input
            vm={ this }
            name={ this.fieldName }
            id={ this.fieldName }
            ref={ this.inputElWrap }
            onClick={ () => {
                popupDialog.open(
                    PickImageDialog,
                    {selectedImageName: this.state.values[this.fieldName],
                    onSelected: img => {
                        this.emitChange(img.fileName);
                    }}
                );
                this.inputElWrap.current.inputEl.blur();
            } }/>;
        return values[this.fieldName] ? <div class="pseudo-form-input has-icon-right">
            { input }
            <button
                onClick={ () => this.emitChange('') }
                class="rad-form-icon">
                <FeatherSvg iconId="x" className="feather-xs"/>
            </button>
        </div> : input;
    }
    /**
     * @access private
     */
    emitChange(fileName) {
        this.form.triggerChange(fileName, this.fieldName);
        this.props.onValueChange(fileName);
    }
}

class PickImageDialog extends preact.Component {
    /**
     * @access protected
     */
    render({selectedImageName}) {
        return <div class="popup-dialog image-picker-dialog"><div class="box">
            <h2>Valitse kuva</h2>
            <div class="main">
                <UploadsManager
                    onEntryClicked={ imageEntry => {
                        this.props.onSelected(imageEntry);
                        popupDialog.close();
                    }}
                    selectedEntryName={ selectedImageName }
                    disableEditing
                    onlyImages/>
                <button onClick={ () => popupDialog.close() }
                        class="btn mt-8"
                        type="button">Peruuta</button>
            </div>
        </div></div>;
    }
}

export default ImagePickerFieldWidget;
