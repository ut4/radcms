import services from './common-services.js';
import {Form} from './common-components.js';

/**
 * #/generate-website.
 */
class WebsiteGenerateView extends preact.Component {
    constructor(props) {
        super(props);
        this.state = {genDetails: null, unexpectedError: null};
    }
    render() {
        let content;
        const g = this.state.genDetails;
        if (!g) {
            content = 'Generate the website to local directory \'<todo>/out/\'?';
        } else if (!this.unexpectedError) {
            content = [
                $el('div', null, ['Wrote ', g.wrotePagesNum, '/', g.totalPages,
                                  ' pages to "', g.outPath,
                                  '", but had the following issues:'].join('')),
                g.issues.map(str => {
                    const [url, ...message] = str.split('>');
                    return $el('div', null, url + ': ' + message.join('>'));
                })
            ];
        } else {
            content = this.state.unexpectedError;
        }
        return $el('div', {className: 'view'}, $el('div', null,
            $el(Form, {onConfirm: () => this.confirm(), noAutoClose: true}, [
                $el('h2', null, 'Generate website'),
                $el('div', null, content)
            ])
        ));
    }
    confirm() {
        services.myFetch('/api/website/generate', {
            method: 'POST',
            headers: {'Content-Type': 'application/x-www-form-urlencoded'},
            data: 'a=b'
        }).then(req => {
            const g = JSON.parse(req.responseText);
            if (!g.issues.length) {
                toast(['Wrote ', g.wrotePagesNum, '/', g.totalPages, ' pages to "',
                       g.outPath, '" in ', g.tookSecs.toFixed(6),
                       ' secs.'].join(''), 'success');
                myRedirect('/');
            } else {
                this.setState({genDetails: JSON.parse(req.responseText)});
            }
        }, req => {
            this.setState({unexpectedError: req.responseText});
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
        services.myFetch('/api/website/waiting-uploads').then(
            res => {
                var data = JSON.parse(res.responseText);
                this.setState({pages: data.pages, files: data.files,
                    noData: data.pages.length == 0 && data.files.length == 0});
            },
            () => { toast('Failed to fetch waiting uploads.', 'error'); }
        );
    }
    render() {
        return $el('div', {className: 'view'}, $el('div', null,
            $el(Form, {
                onConfirm: () => this.confirm(),
                confirmButtonText: 'Upload website',
                doDisableConfirmButton: () => this.state.uploading || this.state.noData,
                noAutoClose: true
            }, [
                $el('h2', null, 'Upload website'),
                !this.state.noData ? [$el('div', {className: 'fieldset'}, [
                    $el('h3', null, 'Credentials'),
                    $el('label', null, [
                        $el('span', null, 'FTP remote url'),
                        $el('input', {
                            name: 'ftpRemoteUrl',
                            value: this.state.remoteUrl,
                            onChange: e => this.receiveInputValue('remoteUrl', e)
                        }, null)
                    ]),
                    $el('label', null, [
                        $el('span', null, 'FTP username'),
                        $el('input', {
                            name: 'ftpUsername',
                            value: this.state.username,
                            onChange: e => this.receiveInputValue('username', e)
                        }, null)
                    ]),
                    $el('label', null, [
                        $el('span', null, 'FTP password'),
                        $el('input', {
                            name: 'ftpPassword',
                            type: 'password',
                            value: this.state.password,
                            onChange: e => this.receiveInputValue('password', e)
                        }, null)
                    ])
                ]),
                this.state.pages.length ? uploadList(this.state.pages, 'Page') : '',
                this.state.files.length ? uploadList(this.state.files, 'File') : ''] :
                'Nothing to upload.'
            ])
        ));
    }
    receiveInputValue(name, e) {
        this.setState({[name]: e.target.value});
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
        services.myFetch('/api/website/upload', {
            method: 'POST',
            headers: {'Content-Type': 'application/x-www-form-urlencoded'},
            data: 'remoteUrl=' + encodeURIComponent(this.state.remoteUrl) +
                    '&username=' + encodeURIComponent(this.state.username) +
                    '&password=' + encodeURIComponent(this.state.password) +
                    pendingPages.map((page, i) =>
                        '&pageUrls[' + i + '][url]=' + encodeURIComponent(page.url) +
                        '&pageUrls[' + i + '][isDeleted]=' + page.deleted
                    ).join('') +
                    pendingFiles.map((file, i) =>
                        '&fileNames[' + i + '][fileName]=' + encodeURIComponent(file.url) +
                        '&fileNames[' + i + '][isDeleted]=' + file.deleted
                    ).join(''),
            progress: (res, _percent) => {
                if (!res.responseText.length) return;
                // <fromPrevIteration>...<lastChunk> -> <lastChunk>
                const lastChunks = res.responseText.substr(lenAlreadyProcessed);
                lenAlreadyProcessed += lastChunks.length;
                const pcs = lastChunks.split('\r\n');
                for (let i = 0; i < pcs.length - 1; i += 2) {
                    const [resourceType, url, uploadResult] = pcs[i + 1].split('|');
                    const list = resourceType == 'page' ? this.state.pages : this.state.files;
                    const idx = list.findIndex(pageOrFile => pageOrFile.url === url);
                    if (uploadResult === '0') {
                        list[idx].uploadStatus = UStatus.UPLOADED;
                        services.signals.emit('itemUploaded');
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
 * @param {{url: string; uploadStatus: number;}[]} items
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
