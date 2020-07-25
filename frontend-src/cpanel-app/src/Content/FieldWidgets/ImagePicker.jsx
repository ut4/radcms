import {http, myFetch, services, urlUtils, hookForm, InputGroup, Input,
        Toaster, toasters, FeatherSvg} from '@rad-commons';
import popupDialog from '../../Common/PopupDialog.jsx';
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
            <label htmlFor={ this.fieldName } class="form-label">{ this.label }</label>
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
        this.state = {images: [], message: null, currentTabIdx: 0};
        this.tabs = preact.createRef();
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
                <Tabs links={ ['Kuvat', 'Lataa'] } onTabChanged={ idx => this.setState({currentTabIdx: idx}) }
                    ref={ this.tabs }/>
                <div class={ this.state.currentTabIdx === 0 ? '' : 'hidden' }>{ !this.state.message
                    ? <div class="item-grid image-grid img-auto mt-10">{ this.state.images.map(image =>
                        <button
                            onClick={ () => {
                                this.props.onSelected(image);
                                popupDialog.close();
                            } }
                            className={ `btn btn-icon ${this.props.selectedImageName !== image.fileName ? '' : ' selected'}` }
                            type="button">
                            <img src={ `${this.props.assetBaseUrl}uploads/${image.fileName}` }/>
                            <span class="caption text-ellipsis">{ image.fileName }</span>
                        </button>
                    ) }</div>
                    : <div class="mt-8">{ this.state.message }</div>
                }</div>
                <div class={ this.state.currentTabIdx !== 1 ? 'hidden' : '' }>
                    <UploadButton onFileUploaded={ this.addImage.bind(this) }/>
                </div>
                <button onClick={ () => popupDialog.close() }
                        class="btn mt-8"
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
        this.setState({images, message: null});
        this.tabs.current.changeTab(0);
    }
}

class Tabs extends preact.Component {
    /**
     * @param {{links: Array<string>; onTabChanged: (idx: number) => any;}} props
     */
    constructor(props) {
        super(props);
        this.state = {currentIdx: 0};
    }
    /**
     * @access protected
     */
    render({links}, {currentIdx}) {
        return <ul class="pl-0 tab">{ links.map((text, i) =>
            <li class={ `tab-item${i !== currentIdx ? '' : ' active'}` }>
                <a onClick={ e => { e.preventDefault(); this.changeTab(i); } }
                    href="#" class="px-2">{ text }</a>
            </li>
        ) }</ul>;
    }
    /**
     * @param {number} toIdx
     * @access public
     */
    changeTab(toIdx) {
        this.setState({currentIdx: toIdx});
        this.props.onTabChanged(toIdx);
    }
}

class UploadButton extends preact.Component {
    /**
     * @access protected
     */
    render() {
        return <div class="container mt-8">
            <Toaster id="fileUpload"/>
            <input onChange={ this.handleFileInputChange.bind(this) }
                id="image-input"
                name="localFile"
                type="file"
                accept="image/*"
                style="position:absolute;opacity:0;z-index:-1"/>
            <label class="columns col-centered" htmlFor="image-input">
                <FeatherSvg iconId="image"/>
                <span class="column">Valitse kuva</span>
            </label>
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
                if (info.file) this.props.onFileUploaded(info.file);
                else throw new Error('Unexpected response');
            })
            .catch(err => {
                services.console.error(err);
                toasters.fileUpload('Kuvan lataus epäonnistui', 'error');
            });
    }
}

export default ImagePickerFieldWidget;
