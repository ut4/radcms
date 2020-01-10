import {services, components} from '../../../rad-commons.js';
const {InputGroup} = components;

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
        return $el('div', null,
            $el('input', {value: this.state.selectedImageName,
                          onClick: () => popupDialog.open(
                              ImagePicker.PickerDialog,
                              {selectedImageName: this.state.selectedImageName,
                               onSelected: img => {
                                   this.props.onChange(img.fileName);
                                   this.setState({selectedImageName: img.fileName});
                               },
                               assetBaseUrl: services.config.assetBaseUrl}
                          )})
        );
    }
}

ImagePicker.PickerDialog = class extends preact.Component {
    /**
     * @param {{onSelected: (image: {fileName: string; basePath: string; mime: string;}) => any; selectedImageName: string; assetBaseUrl: string;}} props
     */
    constructor(props) {
        super(props);
        this.state = {images: [], message: null};
        services.http.get('/api/uploads')
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
        return $el('div', {className: 'popup-dialog'}, $el('div', {className: 'box'},
            $el('h2', null, 'Valitse kuva'),
            $el('div', {className: 'main'},
                $el(ImagePicker.uploadButton),
                $el('div', {className: 'item-grid image-grid'}, !this.state.message
                    ? this.state.images.map(i =>
                        $el('button', {onClick: () => {
                                           this.props.onSelected(i);
                                           popupDialog.close();
                                       },
                                       className: this.props.selectedImageName !== i.fileName ? '' : 'selected',
                                       type: 'button',
                                       'data-caption': i.fileName},
                            $el('img', {src: `${this.props.assetBaseUrl}uploads/${i.fileName}`})
                        )
                    )
                    : $el('div', null,
                        $el('span', null, this.state.message),
                        $el('button', {onClick: () => popupDialog.close(),
                                       className: 'nice-button small',
                                       type: 'button'},
                            'Ok'),
                    ))
            )
        ));
    }
};

ImagePicker.uploadButton = class extends preact.Component {
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
        return $el('div', null,
            $el(InputGroup, null,
                $el('input', {onChange: e => { this.handleFileInputChange(e); },
                              name: 'localFile',
                              type: 'file',
                              accept: 'image/*',
                              form: this.hiddenFormId})
            ),
            $el('input', {value: window.location.href,
                          name: 'returnTo',
                          type: 'hidden',
                          form: this.hiddenFormId}),
        );
    }
    /**
     * @access private
     */
    initHiddenUploadForm() {
        if (this.hiddenForm) return;
        this.hiddenForm = window.document.createElement('form');
        this.hiddenForm.action = services.myFetch.makeUrl('/api/uploads');
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
};

export default ImagePicker;
