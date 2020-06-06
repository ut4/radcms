import {http, urlUtils, hookForm, InputGroup, Input} from '@rad-commons';
import popupDialog from '../../Common/PopupDialog.jsx';
import BaseFieldWidget from './Base.jsx';

class ImagePickerFieldWidget extends BaseFieldWidget {
    /**
     * @inheritdoc
     */
    constructor(props) {
        super(props);
        this.fieldName = props.field.name;
        this.state = hookForm(this, {[this.fieldName]: this.fixedInitialValue});
    }
    /**
     * @returns {string}
     * @access protected
     */
    getInitialValue() {
        return '';
    }
    /**
     * @access protected
     */
    render() {
        return <InputGroup classes={ this.state.classes[this.fieldName] }>
            <label htmlFor={ this.fieldName }>{ this.label }</label>
            <Input vm={ this }
                    name={ this.fieldName }
                    id={ this.fieldName }
                    onClick={ () => popupDialog.open(
                        PickImageDialog,
                        {selectedImageName: this.state.values[this.fieldName],
                         onSelected: img => {
                             this.form.triggerChange(img.fileName, this.fieldName);
                             this.props.onValueChange(img.fileName);
                         },
                         assetBaseUrl: urlUtils.assetBaseUrl}
                    ) }/>
        </InputGroup>;
    }
}

class PickImageDialog extends preact.Component {
    /**
     * @param {{onSelected: (image: {fileName: string; basePath: string; mime: string;}) => any; selectedImageName: string; assetBaseUrl: string;}} props
     */
    constructor(props) {
        super(props);
        this.state = {images: [], message: null};
        http.get('/api/uploads')
            .then(list => {
                const images = list.filter(f => f.mime.startsWith('image'));
                this.setState({images, message: images.length ? null : 'Ei kuvia.'});
            })
            .catch(() => {
                this.setState({message: 'Jokin meni pieleen.'});
            });
    }
    /**
     * @access protected
     */
    render() {
        return <div class="popup-dialog"><div class="box">
            <h2>Valitse kuva</h2>
            <div class="main">
                <UploadButton/>
                <div class="item-grid image-grid container">{ !this.state.message
                    ? this.state.images.map(i => <button onClick={ () => {
                                    this.props.onSelected(i);
                                    popupDialog.close();
                                } }
                                className={ this.props.selectedImageName !== i.fileName ? '' : 'selected' }
                                type="button">
                            <img src={ `${this.props.assetBaseUrl}uploads/${i.fileName}` }/>
                            <span class="caption">{ i.fileName }</span>
                        </button> )
                    : <div>
                        <span>{ this.state.message }</span>
                        <button onClick={ () => popupDialog.close() }
                                class="nice-button small"
                                type="button">Ok</button>
                    </div>
                }</div>
                <button onClick={ () => popupDialog.close() }
                        class="nice-button small"
                        type="button">Peruuta</button>
            </div>
        </div></div>;
    }
}

class UploadButton extends preact.Component {
    /**
     * @param {Object} props
     */
    constructor(props) {
        super(props);
        this.hiddenForm = document.getElementById(this.hiddenFormId);
        this.hiddenFormId = 'hidden-upload-form';
        this.initHiddenUploadForm();
    }
    /**
     * @access protected
     */
    render() {
        return <div>
            <InputGroup>
                <input onChange={ e => { this.handleFileInputChange(e); } }
                       name="localFile"
                       type="file"
                       accept="image/*"
                       form={ this.hiddenFormId }/>
            </InputGroup>
            <input value={ window.location.href }
                   name="returnTo"
                   type="hidden"
                   form={ this.hiddenFormId }/>
        </div>;
    }
    /**
     * @access private
     */
    initHiddenUploadForm() {
        if (this.hiddenForm) return;
        this.hiddenForm = document.createElement('form');
        this.hiddenForm.action = urlUtils.makeUrl('/api/uploads');
        this.hiddenForm.method = 'post';
        this.hiddenForm.enctype = 'multipart/form-data';
        this.hiddenForm.id = this.hiddenFormId;
        document.body.appendChild(this.hiddenForm);
    }
    /**
     * @access private
     */
    handleFileInputChange(e) {
        if (e.target.value) this.hiddenForm.submit();
    }
}

export default ImagePickerFieldWidget;
