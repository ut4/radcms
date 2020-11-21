import {http, myFetch, Toaster, toasters, FeatherSvg, urlUtils, env, config,
        InputGroup, Input, InputError, hookForm} from '@rad-commons';
import LoadingSpinner from '../Common/LoadingSpinner.jsx';
import Tabs from '../Common/Tabs.jsx';
import {timingUtils} from '../Common/utils.js';
import ImageDeleteDialog from './ImageDeleteDialog.jsx';
const INITIAL_CACHE_KEY = '';
const MAX_FILE_SIZE_MB = 8;

class UploadsManager extends preact.Component {
    /**
     * @param {{onEntryClicked: (image: Object) => any; onlyImages?: boolean; selectedEntryName?: string; disableEditing?: boolean;}} props
     */
    constructor(props) {
        super(props);
        this.state = {files: null, currentTabIdx: 0, fetching: true, showEditButtons: false};
        this.title = props.onlyImages !== true ? 'Tiedostot' : 'Kuvat';
        this.tabs = preact.createRef();
        this.searchResultCache = new Map();
        this.debouncedOnSearchTermTyped = timingUtils.debounce(
            this.onSearchTermTyped.bind(this), 200);
        this.fetchFilesAndSetToState(props.onlyImages, INITIAL_CACHE_KEY, true);
    }
    /**
     * @access protected
     */
    render({disableEditing}, {files, currentTabIdx, showEditButtons}) {
        return <div>
            <Tabs links={ [this.title, 'Lataa'] } onTabChanged={ idx => this.setState({currentTabIdx: idx}) }
                ref={ this.tabs }/>
            <div class={ currentTabIdx === 0 ? 'mt-10' : 'hidden' }>
                <div class="container"><div class="columns">
                    <div class="pseudo-form-input has-icon-right col-10 mb-10">
                        <input class="form-input" placeholder="Suodata" onInput={ this.debouncedOnSearchTermTyped }/>
                        <i class="rad-form-icon"><FeatherSvg iconId="search" className="feather-md"/></i>
                    </div>
                    { !disableEditing && files && files.length ? <button class="btn d-flex col-ml-auto btn-icon" onClick={ () => this.setState({showEditButtons: !showEditButtons}) }>
                        <FeatherSvg iconId={ !showEditButtons ? 'lock' : 'unlock' } className="feather-md"/>
                    </button> : null}
                </div></div>
                { files ? files.length
                    ? <div class="item-grid image-grid img-auto grid-col-lg-three">{ this.state.files.map(entry =>
                        <button
                            onClick={ () => { this.props.onEntryClicked(entry); } }
                            className={ `btn btn-icon ${this.props.selectedEntryName !== entry.fileName ? '' : ' selected'}` }
                            type="button">
                            { entry.mime.startsWith('image/')
                                ? <div class="img-ratio"><img src={ `${urlUtils.assetBaseUrl}uploads/${entry.fileName}` }/></div>
                                : <span>{ entry.mime }</span> }
                            <span class="caption text-ellipsis">{ entry.fileName }</span>
                            <button
                                onClick={ () => ImageDeleteDialog.open({
                                    fileName: entry.fileName,
                                    onConfirm: () => this.deleteFile(entry)
                                }) }
                                class={ `btn btn-icon close opaque-white${!showEditButtons ? ' d-none' : ''}` }
                                type="button">
                                <FeatherSvg iconId="trash" className="feather-sm"/>
                            </button>
                        </button>
                    ) }</div>
                    : <p class="my-0">{ this.searchTerm !== INITIAL_CACHE_KEY || this.searchedAtLeastOnce ? `Ei tuloksia hakusanalla "${this.searchTerm}"` : ['Ei vielä latauksia.', <i>(i)</i>, 'Mikäli olet lisännyt tiedostoja manuaalisesti lataukset-kansioon, voit synkronoida ne ', <a href="#/rescan-uploads">Skannaa -näkymässä</a>] }.</p>
                : <LoadingSpinner/> }</div>
            <div class={ this.state.currentTabIdx !== 1 ? 'hidden' : 'mt-10' }>
                <UploadButton onFileUploaded={ this.addEntry.bind(this) }/>
            </div>
        </div>;
    }
    /**
     * @access private
     */
    addEntry(entry) {
        const files = this.state.files;
        files.push(entry);
        files.sort((a, b) => a.fileName.localeCompare(b.fileName));
        this.setState({files, message: null});
        this.searchResultCache = new Map();
        this.tabs.current.changeTab(0);
    }
    /**
     * @access private
     */
    fetchFiles(term, onlyImages, isInitial) {
        if (this.searchResultCache.has(term))
            return Promise.resolve(this.searchResultCache.get(term));
        if (!isInitial)
            this.setState({fetching: true});
        //
        let filters = {};
        if (onlyImages) filters.mime = {$eq: 'image/*'};
        if (term) filters.fileName = {$contains: term};
        //
        return http.get('/api/uploads' + (filters.mime || filters.fileName
                                            ? `/${JSON.stringify(filters)}`
                                            : ''))
            .then(files => {
                this.searchResultCache.set(term, files);
                return this.searchResultCache.get(term);
            });
    }
    /**
     * @access private
     */
    fetchFilesAndSetToState(onlyImages, searchTerm, isInitial = false) {
        this.searchTerm = searchTerm;
        this.searchedAtLeastOnce = !isInitial;
        this.fetchFiles(searchTerm, onlyImages, isInitial)
            .then(files => { this.setState({files, fetching: false}); })
            .catch(env.console.error);
    }
    /**
     * @access private
     */
    onSearchTermTyped(e) {
        if (!this.state.fetching)
            this.fetchFilesAndSetToState(this.props.onlyImages, e.target.value);
    }
    /**
     * @access private
     */
    deleteFile(file) {
        http.delete('/api/uploads/' +
                    encodeURIComponent(file.fileName) + '/' +
                    encodeURIComponent(file.basePath))
            .then(info => {
                if (info.ok) {
                    this.setState({files: this.state.files.filter(file2 => file2 !== file)});
                    this.searchResultCache = new Map();
                } else throw new Error(info);
            })
            .catch(err => {
                env.console.error(err);
                toasters.main('Tiedoston poistaminen ei onnistunut.', 'error');
            });
    }
}

class UploadButton extends preact.Component {
    /**
     * @param {{onFileUploaded: (image: {fileName: string; basePath: string; mime: string; friendlyName?: string;}) => any;}} props
     */
    constructor(props) {
        super(props);
        this.selectedImage = null;
        this.state = {selectedImageSrc: null, validationError: null};
    }
    /**
     * @access protected
     */
    render(_, {selectedImageSrc, validationError}) {
        return <div class={ !selectedImageSrc ? 'container' : 'image-selected' }>
            <Toaster id="fileUpload"/>
            <input onChange={ this.handleFileInputChange.bind(this) }
                id="image-input"
                name="localFile"
                type="file"
                accept="image/*"
                style="position:absolute;opacity:0;z-index:-1"/>
            <label class={ !selectedImageSrc ? 'columns col-centered' : '' } htmlFor="image-input">
                { !selectedImageSrc ? [
                    <FeatherSvg iconId="image"/>,
                    <span class="column">Valitse kuva</span>
                ] : <img src={ selectedImageSrc }/> }
            </label>
            <div class="has-error"><InputError error={ validationError }/></div>
            { !selectedImageSrc || [
                <InputGroup classes={ this.state.classes.fileName }>
                    <label htmlFor="fileName" class="form-label">Tiedostonimi</label>
                    <Input vm={ this } name="fileName" id="fileName" errorLabel="Tiedostonimi"
                        validations={ [['regexp', '^[^/]*$', ' ei kelpaa'], ['maxLength', 255]] }/>
                    <InputError error={ this.state.errors.fileName }/>
                </InputGroup>,
                <div class="form-buttons mt-8">
                    <button onClick={ this.uploadSelectedImage.bind(this) } class="btn btn-primary" type="button">Lataa kuva</button>
                </div>
            ] }
        </div>;
    }
    /**
     * @access private
     */
    handleFileInputChange(e) {
        if (!e.target.value) return;
        const file = e.target.files[0];
        if (!file.type.startsWith('image/')) {
            this.setState({validationError: 'Tiedostopääte ei kelpaa'});
            return;
        }
        if (file.size >= MAX_FILE_SIZE_MB * 1024 * 1024) {
            this.setState({validationError: `Tiedosto saa olla enintään ${MAX_FILE_SIZE_MB}MB`});
            return;
        }
        if (this.state.validationError) this.setState({validationError: null});
        const reader = new FileReader();
        reader.onload = e => {
            this.setState(Object.assign(
                {selectedImageSrc: e.target.result},
                hookForm(this, {fileName: this.selectedImage.name})
            ));
        };
        this.selectedImage = e.target.files[0];
        reader.readAsDataURL(this.selectedImage);
    }
    /**
     * @access private
     */
    uploadSelectedImage() {
        if (!this.form.handleSubmit())
            return;
        //
        const data = new FormData();
        data.append('localFile', this.selectedImage);
        data.append('fileName', this.state.values.fileName);
        data.append('csrfToken', config.csrfToken);
        //
        myFetch('/api/uploads', {method: 'POST', data})
            .then(res => JSON.parse(res.responseText))
            .then(info => {
                if (!info.file) throw new Error('Unexpected response');
                this.selectedImage = null;
                this.setState({selectedImageSrc: null});
                this.props.onFileUploaded(info.file);
            })
            .catch(err => {
                env.console.error(err);
                toasters.fileUpload('Kuvan lataus epäonnistui', 'error');
            });
    }
}

export default UploadsManager;
