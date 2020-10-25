import {http, myFetch, Toaster, toasters, FeatherSvg, urlUtils, env, config,
        InputGroup, Input, InputError, hookForm} from '@rad-commons';
import LoadingSpinner from '../Common/LoadingSpinner.jsx';
import Tabs from '../Common/Tabs.jsx';
import {timingUtils} from '../Common/utils.js';
const INITIAL_CACHE_KEY = '';

class UploadsManager extends preact.Component {
    /**
     * @param {{onEntryClicked: (image: Object) => any; onlyImages?: boolean; selectedEntryName?: string;}} props
     */
    constructor(props) {
        super(props);
        this.state = {files: null, currentTabIdx: 0, fetching: true};
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
    render(_, {files, currentTabIdx}) {
        return <div>
            <Tabs links={ [this.title, 'Lataa'] } onTabChanged={ idx => this.setState({currentTabIdx: idx}) }
                ref={ this.tabs }/>
            <div class={ currentTabIdx === 0 ? 'mt-10' : 'hidden' }>
                <div class="pseudo-form-input has-icon-right mb-10">
                    <input class="form-input" placeholder="Suodata" onInput={ this.debouncedOnSearchTermTyped }/>
                    <i class="rad-form-icon"><FeatherSvg iconId="search" className="feather-md"/></i>
                </div>
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
                        </button>
                    ) }</div>
                    : <p class="my-0">{ this.searchTerm !== INITIAL_CACHE_KEY ? `Ei tuloksia hakusanalla "${this.searchTerm}"` : ['Ei vielä latauksia.', <i>(i)</i>, 'Mikäli olet lisännyt tiedostoja manuaalisesti lataukset-kansioon, voit synkronoida ne ', <a href="#/rescan-uploads">Skannaa -näkymässä</a>] }.</p>
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
}

class UploadButton extends preact.Component {
    /**
     * @param {{onFileUploaded: (image: {fileName: string; basePath: string; mime: string; friendlyName?: string;}) => any;}} props
     */
    constructor(props) {
        super(props);
        this.selectedImage = null;
        this.state = {selectedImageSrc: null};
    }
    /**
     * @access protected
     */
    render(_, {selectedImageSrc}) {
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
