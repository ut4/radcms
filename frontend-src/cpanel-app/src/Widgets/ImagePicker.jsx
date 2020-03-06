import {config, urlUtils, http, InputGroup} from '@rad-commons';

class ImagePicker extends preact.Component {
    /**
     * @param {{value: string; onChange: (imageFileName: string) => any; [key:string]: any;}} props
     */
    constructor(props) {
        super(props);
        this.state = {selectedImageName: props.value};
    }
    /**
     * @access protected
     */
    render() {
        return <div>
            <input value={ this.state.selectedImageName }
                    onClick={ () => popupDialog.open(
                        PickImageDialog,
                        {selectedImageName: this.state.selectedImageName,
                        onSelected: img => {
                            this.props.onChange(img.fileName);
                            this.setState({selectedImageName: img.fileName});
                        },
                        assetBaseUrl: config.assetBaseUrl}
                    ) }/>
        </div>;
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
                <div class="item-grid image-grid">{ !this.state.message
                    ? this.state.images.map(i => <button onClick={ () => {
                                    this.props.onSelected(i);
                                    popupDialog.close();
                                } }
                                className={ this.props.selectedImageName !== i.fileName ? '' : 'selected' }
                                type="button"
                                data-caption={ i.fileName }>
                            <img src={ `${this.props.assetBaseUrl}uploads/${i.fileName}` }/>
                        </button> )
                    : <div>
                        <span>{ this.state.message }</span>
                        <button onClick={ () => popupDialog.close() }
                                class="nice-button small"
                                type="button">Ok</button>
                    </div>
                }</div>
            </div>
        </div></div>;
    }
}

class UploadButton extends preact.Component {
    /**
     * @..
     */
    constructor(props) {
        super(props);
        this.hiddenForm = null;
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
        this.hiddenForm = window.document.createElement('form');
        this.hiddenForm.action = urlUtils.makeUrl('/api/uploads');
        this.hiddenForm.method = 'POST';
        this.hiddenForm.enctype = 'multipart/form-data';
        this.hiddenForm.id = this.hiddenFormId;
        window.document.body.appendChild(this.hiddenForm);
    }
    /**
     * @access private
     */
    handleFileInputChange(e) {
        if (e.target.value) this.hiddenForm.submit();
    }
}

export default ImagePicker;
