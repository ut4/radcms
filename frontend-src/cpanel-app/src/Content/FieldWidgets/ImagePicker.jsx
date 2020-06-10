import {http, myFetch, services, urlUtils, hookForm, InputGroup, Input,
        Toaster, toasters} from '@rad-commons';
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
        this.inputElWrap = preact.createRef();
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
            <Input
                vm={ this }
                name={ this.fieldName }
                id={ this.fieldName }
                ref={ this.inputElWrap }
                onClick={ () => {
                    popupDialog.open(
                        PickImageDialog,
                        {selectedImageName: this.state.values[this.fieldName],
                         onSelected: img => {
                              this.form.triggerChange(img.fileName, this.fieldName);
                              this.props.onValueChange(img.fileName);
                         },
                         assetBaseUrl: urlUtils.assetBaseUrl}
                    );
                    this.inputElWrap.current.inputEl.blur();
                } }/>
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
                images.sort();
                this.setState({images, message: images.length ? null : 'Ei kuvia.'});
            })
            .catch(err => {
                services.console.error(err);
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
                <UploadButton onFileLoaded={ image => this.addImage(image) }/>
                <div class="item-grid image-grid container">{ !this.state.message
                    ? this.state.images.map(image => <button onClick={ () => {
                                    this.props.onSelected(image);
                                    popupDialog.close();
                                } }
                                className={ this.props.selectedImageName !== image.fileName ? '' : 'selected' }
                                type="button">
                            <img src={ `${this.props.assetBaseUrl}uploads/${image.fileName}` }/>
                            <span class="caption">{ image.fileName }</span>
                        </button>)
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
    /**
     * @access private
     */
    addImage(image) {
        const images = this.state.images;
        images.push(image);
        images.sort((a, b) => a.fileName.localeCompare(b.fileName));
        this.setState({images});
    }
}

class UploadButton extends preact.Component {
    /**
     * @access protected
     */
    render() {
        return <div>
            <Toaster id="fileUpload"/>
            <InputGroup>
                <input onChange={ e => { this.handleFileInputChange(e); } }
                       name="localFile"
                       type="file"
                       accept="image/*"/>
            </InputGroup>
        </div>;
    }
    /**
     * @access private
     */
    handleFileInputChange(e) {
        if (!e.target.value) return;
        //
        const data = new FormData();
        data.append('localFile', e.target.files[0]);
        //
        myFetch('/api/uploads', {method: 'POST', data: data})
            .then(res => JSON.parse(res.responseText))
            .then(info => {
                if (info.file) this.props.onFileLoaded(info.file);
                else throw new Error('Unexpected response');
            })
            .catch(err => {
                services.console.error(err);
                toasters.fileUpload('Kuvan lataus epäonnistui', 'error');
            });
    }
}

export default ImagePickerFieldWidget;
