import {http, myFetch, Toaster, toasters, FeatherSvg, urlUtils, env} from '@rad-commons';
import LoadingSpinner from '../Common/LoadingSpinner.jsx';

class UploadsManager extends preact.Component {
    /**
     * @param {{onEntryClicked: (image: Object) => any; onlyImages?: boolean; selectedEntryName?: string;}} props
     */
    constructor(props) {
        super(props);
        this.state = {files: null, currentTabIdx: 0};
        this.title = props.onlyImages !== true ? 'Tiedostot' : 'Kuvat';
        this.tabs = preact.createRef();
        http.get(`/api/uploads${props.onlyImages !== true ? '' : '/images'}`)
            .then(files => this.setState({files}))
            .catch(env.console.error);
    }
    /**
     * @access protected
     */
    render(_, {files, currentTabIdx}) {
        return <div>
            <Tabs links={ [this.title, 'Lataa'] } onTabChanged={ idx => this.setState({currentTabIdx: idx}) }
                ref={ this.tabs }/>
            <div class={ currentTabIdx === 0 ? 'mt-10' : 'hidden' }>{ files
                ? files.length
                    ? [<div class="pseudo-form-input has-icon-right mb-10">
                        <input class="form-input" placeholder="Suodata"/>
                        <i class="form-icon"><FeatherSvg iconId="search" className="feather-md"/></i>
                    </div>,
                    <div class="item-grid image-grid img-auto">{ this.state.files.map(entry =>
                        <button
                            onClick={ () => { this.props.onEntryClicked(entry); } }
                            className={ `btn btn-icon ${this.props.selectedEntryName !== entry.fileName ? '' : ' selected'}` }
                            type="button">
                            { entry.mime.startsWith('image/')
                                ? <img src={ `${urlUtils.assetBaseUrl}uploads/${entry.fileName}` }/>
                                : <span>{ entry.mime }</span> }
                            <span class="caption text-ellipsis">{ entry.fileName }</span>
                        </button>
                    ) }</div>]
                    : <p class="my-0">Ei vielä latauksia. <i>(i)</i> Mikäli olet lisännyt tiedostoja manuaalisesti lataukset-kansioon, voit synkronoida ne <a href="#/rescan-uploads">Skannaa -näkymässä</a>.</p>
                : <LoadingSpinner/>
            }</div>
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
        return <div class="container">
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
        myFetch('/api/uploads', {method: 'POST', data})
            .then(res => JSON.parse(res.responseText))
            .then(info => {
                if (info.file) this.props.onFileUploaded(info.file);
                else throw new Error('Unexpected response');
            })
            .catch(err => {
                env.console.error(err);
                toasters.fileUpload('Kuvan lataus epäonnistui', 'error');
            });
    }
}

export default UploadsManager;
