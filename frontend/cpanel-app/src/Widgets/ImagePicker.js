import {services} from '../../../rad-commons.js';

class ImagePicker extends preact.Component {
    /**
     * @param {{value: string; onChange: (imageFileName: string) => any; [key:string]: any;}} props
     */
    constructor(props) {
        super(props);
        this.state = {dialogIsOpen: false, selectedImageName: props.value};
    }
    /**
     * @access protected
     */
    render() {
        return $el('div', null,
            $el('input', {value: this.state.selectedImageName,
                          onClick: () => this.setState({dialogIsOpen: true})}),
            !this.state.dialogIsOpen
                ? null
                : $el(ImagePicker.PickerDialog, {selectedImageName: this.state.selectedImageName,
                                                 onSelected: img => {
                                                     this.props.onChange(img.fileName);
                                                     this.setState({selectedImageName: img.fileName,
                                                                    dialogIsOpen: false});
                                                 },
                                                 onCancel: () => {
                                                     this.setState({dialogIsOpen: false});
                                                 },
                                                 assetBaseUrl: services.config.assetBaseUrl})
        );
    }
}

ImagePicker.PickerDialog = class extends preact.Component {
    /**
     * @param {{onSelected: (image: {fileName: string; basePath: string; mime: string;}) => any; onCancel: () => any; selectedImageName: string; assetBaseUrl: string;}} props
     */
    constructor(props) {
        super(props);
        this.state = {images: [], message: null};
        services.myFetch('/api/uploads')
            .then(res => JSON.parse(res.responseText))
            .then(list => {
                const images = list.filter(f => f.mime === 'image/jpeg');
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
        return $el('div', {class: 'popup-dialog-dialog'}, $el('div', {class: 'box'},
            $el('h2', null, 'Valitse kuva'),
            $el('div', {class: 'main'},
                $el('div', {class: 'item-list'}, !this.state.message
                    ? this.state.images.map(i =>
                        $el('button', {onClick: () => this.props.onSelected(i),
                                       className: this.props.selectedImageName !== i.fileName ? '' : 'selected',
                                       type: 'button',
                                       'data-caption': i.fileName},
                            $el('img', {src: `${this.props.assetBaseUrl}uploads/${i.fileName}`})
                        )
                    )
                    : $el('div', null,
                        $el('span', null, this.state.message),
                        $el('button', {onClick: () => this.props.onCancel(), type: 'button'},
                            'Ok'),
                    ))
            )
        ));
    }
};

export default ImagePicker;
