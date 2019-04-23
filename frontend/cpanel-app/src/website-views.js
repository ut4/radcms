import services from '../../src/common-services.js';
import {view, myLink, Form} from '../../src/common-components.js';
import {ControlPanel} from './cpanel-app.js';

/**
 * #/generate-website.
 */
class WebsiteGenerateView extends preact.Component {
    constructor(props) {
        super(props);
        this.outPath = (props.sitePath || ControlPanel.currentPageData.sitePath) + 'out';
        this.state = {pages: null, files: null, genResults: null,
                      doDisableSubmit: false};
        services.myFetch('/api/websites/current/site-graph?files=1').then(req => {
            const siteGraph = JSON.parse(req.responseText);
            siteGraph.pages.forEach((_, i) => { siteGraph.pages[i].selected = true; });
            siteGraph.files.forEach((_, i) => { siteGraph.files[i].selected = true; });
            this.setState(siteGraph);
        }, () => {
            toast('Failed to fetch site graph.', 'error');
        });
    }
    render() {
        let content = '';
        if (this.state.pages) {
            content = $el('div', {className: 'list list-small'},
                $el('p', null, 'Write selected pages and files to "' + this.outPath + '"?'),
                $el('h3', null, 'Pages'),
                this.buildCheckboxList('pages'),
                $el('h3', null, 'Files'),
                this.buildCheckboxList('files')
            );
        } else if (this.state.genResults) {
            const g = this.state.genResults;
            content = [
                $el('p', null, ['Wrote ', g.wrotePagesNum, '/', g.totalPages,
                    ' pages and copied ', g.wroteFilesNum, '/', g.totalFiles,
                    ' asset files to "', this.outPath, '" in ', g.tookSecs.toFixed(6),
                    ' secs.'].join(''))
            ];
            if (g.issues.length) {
                content.push($el('h3', null, 'Issues'));
                content.push(...g.issues.map(str =>
                    $el('div', null, str.replace(/>/g, ': '))
                ));
            }
        }
        return view($el(Form, {onConfirm: () => this.confirm(),
                               confirmButtonText: 'Generate',
                               doDisableConfirmButton: () => this.state.doDisableSubmit,
                               noAutoClose: true},
            $el('h2', null, 'Generate website'),
            $el('div', null, content)
        ));
    }
    buildCheckboxList(type) {
        const list = this.state[type];
        const disabled = type == 'pages'; // Not supported yet
        return $el('div', null, list.length
            ? list.map(item =>
                $el('div', null,
                $el('input', {type: 'checkbox',
                              id: 'cb-' + item.url,
                              checked: item.selected,
                              disabled,
                              onChange: e => {
                                  item.selected = e.target.checked;
                                  this.setState({[type]: this.state[type]});
                              }}),
                $el('label', {for: 'cb-' + item.url, className: 'inline'}, item.url),
            ))
            : $el('div', null, '-')
        );
    }
    confirm() {
        this.setState({doDisableSubmit: true});
        services.myFetch('/api/websites/current/generate', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            data: JSON.stringify({
                pages: this.state.pages.map((p, i) => p.selected ? i : -1)
                                       .filter(idx => idx > -1),
                files: this.state.files.map((f, i) => f.selected ? i : -1)
                                       .filter(idx => idx > -1)
            })
        }).then(req => {
            this.setState({genResults: JSON.parse(req.responseText),
                           pages: null, doDisableSubmit: false});
        }, () => {
            this.setState({pages: null, doDisableSubmit: false});
        });
    }
}

const UStatus = Object.freeze({
    NOT_UPLOADED: 0,
    OUTDATED: 1,
    UPLOADED: 2,
    DELETED: 3,
    UPLOADING: 4,
    ERROR: 5,
});

const UStatusToStr = [
    "Add",        // UStatus.NOT_UPLOADED(0)
    "Update",     // UStatus.OUTDATED(1)
    "Ok",         // UStatus.UPLOADED(2)
    "Remove",     // UStatus.DELETED(3)
    "Pending...", // UStatus.UPLOADING(4)
    "Error",      // UStatus.ERROR(5)
];

/**
 * #/upload-website.
 */
class WebsiteUploadView extends preact.Component {
    constructor(props) {
        super(props);
        this.state = {
            remoteUrl: 'ftp://ftp.mysite.net/public_html',
            username: 'ftp@mysite.net',
            password: '',
            uploading: false,
            pages: [],
            files: [],
            noData: false
        };
        services.myFetch('/api/websites/current/waiting-uploads').then(
            res => {
                const data = JSON.parse(res.responseText);
                this.setState({pages: data.pages, files: data.files,
                    noData: data.pages.length == 0 && data.files.length == 0});
            },
            () => { toast('Failed to fetch waiting uploads.', 'error'); }
        );
    }
    render() {
        return view($el(Form, {onConfirm: () => this.confirm(),
                               confirmButtonText: 'Upload website',
                               doDisableConfirmButton: () =>
                                   this.state.uploading || this.state.noData,
                               noAutoClose: true},
            $el('h2', null, 'Upload website'),
            !this.state.noData ? [$el('div', {className: 'fieldset'}, [
                $el('h3', null, 'Credentials'),
                $el('label', null, [
                    $el('span', null, 'FTP remote url'),
                    $el('input', {
                        name: 'ftpRemoteUrl',
                        value: this.state.remoteUrl,
                        onChange: e => Form.receiveInputValue(e, this, 'remoteUrl')
                    }, null)
                ]),
                $el('label', null, [
                    $el('span', null, 'FTP username'),
                    $el('input', {
                        name: 'ftpUsername',
                        value: this.state.username,
                        onChange: e => Form.receiveInputValue(e, this, 'username')
                    }, null)
                ]),
                $el('label', null, [
                    $el('span', null, 'FTP password'),
                    $el('input', {
                        name: 'ftpPassword',
                        type: 'password',
                        value: this.state.password,
                        onChange: e => Form.receiveInputValue(e, this, 'password')
                    }, null)
                ])
            ]),
            this.state.pages.length ? myLink('/edit-site-graph', 'Too many pages? Edit them here.') : '',
            this.state.pages.length ? uploadList(this.state.pages, 'Page') : '',
            this.state.files.length ? uploadList(this.state.files, 'File') : ''] :
            'Nothing to upload.'
        ));
    }
    confirm() {
        const pendingPages = [];
        const pendingFiles = [];
        const makeUploadable = (item, collectTo) => {
            if (item.uploadStatus != UStatus.UPLOADED) {
                item.deleted = item.uploadStatus != UStatus.DELETED ? 0 : 1;
                item.uploadStatus = UStatus.UPLOADING;
                collectTo.push(item);
            }
        };
        this.state.pages.forEach(page => makeUploadable(page, pendingPages));
        this.state.files.forEach(file => makeUploadable(file, pendingFiles));
        this.setState({uploading: true, pages: this.state.pages, files: this.state.files});
        let lenAlreadyProcessed = 0;
        services.myFetch('/api/websites/current/upload', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            data: JSON.stringify({
                remoteUrl: this.state.remoteUrl,
                username: this.state.username,
                password: this.state.password,
                pageUrls: pendingPages.map(p => ({url: p.url, isDeleted: p.deleted})),
                fileNames: pendingFiles.map(f => ({fileName: f.url, isDeleted: f.deleted}))
            }),
            progress: (res, _percent) => {
                if (!res.responseText.length) return;
                // <fromPrevIteration>...<lastChunk> -> <lastChunk>
                const lastChunks = res.responseText.substr(lenAlreadyProcessed);
                lenAlreadyProcessed += lastChunks.length;
                const pcs = lastChunks.split('|');
                for (let i = 0; i < pcs.length - 1; i += 3) {
                    const [resourceType, url, uploadResult] = pcs.slice(i, i + 3);
                    const list = resourceType == 'page' ? this.state.pages : this.state.files;
                    const idx = list.findIndex(pageOrFile => pageOrFile.url === url);
                    if (uploadResult === 'ok') {
                        list[idx].uploadStatus = UStatus.UPLOADED;
                        services.signals.emit('numWaitingUploadsChanged', old => old - 1);
                    } else {
                        list[idx].uploadStatus = UStatus.ERROR;
                    }
                }
                this.setState({pages: this.state.pages, files: this.state.files});
            }
        }).then(() => {
            this.setState({uploading: false});
            const message = [];
            let totalSuccesfulUploads = 0;
            const countSuccesfulUploads = (n, item) => {
                if (item.uploadStatus === UStatus.UPLOADED) {
                    totalSuccesfulUploads += 1;
                    n += 1;
                }
                return n;
            };
            if (pendingPages.length) message.push(pendingPages.reduce(
                countSuccesfulUploads, 0) + '/' + pendingPages.length + ' pages');
            if (pendingFiles.length) message.push(pendingFiles.reduce(
                countSuccesfulUploads, 0) + '/' + pendingFiles.length + ' files');
            const nTotal = pendingPages.length + pendingFiles.length;
            toast('Uploaded ' + message.join(' and ') + '.',
                  totalSuccesfulUploads === nTotal ? 'success' : 'error');
        }, () => {
            this.setState({uploading: false});
            toast('Failed to upload items.', 'error');
        });
    }
}

/**
 * @param {Array<{url: string; uploadStatus: number;}>} items
 * @param {string} name
 */
function uploadList(items, name) {
    return $el('div', null, $el('table', {className: 'striped'}, [
        $el('thead', null, $el('tr', null, [
            $el('th', null, name),
            $el('th', null, 'Task to be performed'),
        ])),
        $el('tbody', null, items.map(item => $el('tr', null, [
            $el('td', null, item.url),
            $el('td', null, UStatusToStr[item.uploadStatus]),
        ])))
    ]));
}

export {WebsiteGenerateView, WebsiteUploadView, UStatus as UploadStatus};
