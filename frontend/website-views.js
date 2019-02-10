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
    UPLOADING: 3,
    ERROR: 4,
});

const UStatusToStr = [
    "No",            // UStatus.NOT_UPLOADED(0)
    "Yes(outdated)", // UStatus.OUTDATED(1)
    "Yes",           // UStatus.UPLOADED(2)
    "Uploading...",  // UStatus.UPLOADING(3)
    "Error",         // UStatus.ERROR(4)
];

/**
 * #/upload-website.
 */
class WebsiteUploadView extends preact.Component {
    constructor(props) {
        super(props);
        this.state = {
            remoteUrl: 'ftp://ftp.mysite.net/public_html/',
            username: 'ftp@mysite.net',
            password: '',
            uploading: false,
            pages: [],
            files: []
        };
        services.myFetch('/api/website/upload-statuses').then(
            res => {
                var data = JSON.parse(res.responseText);
                this.setState({pages: data.pages, files: data.files});
            },
            () => { toast('Failed to fetch pending changes.', 'error'); }
        );
    }
    render() {
        return $el('div', {className: 'view'}, $el('div', null,
            $el(Form, {
                onConfirm: () => this.confirm(),
                confirmButtonText: 'Upload website',
                doDisableConfirmButton: () => this.state.uploading,
                noAutoClose: true
            }, [
                $el('h2', null, 'Upload website'),
                $el('div', {className: 'fieldset'}, [
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
                this.state.files.length ? uploadList(this.state.files, 'File') : ''
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
                    pendingFiles.map((file, i) =>
                        '&fileNames[' + i + ']=' + encodeURIComponent(file.url)
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
            const nSuccesfulUploads = pendingPages.reduce(
                (n, page) => n + (page.uploadStatus === UStatus.UPLOADED), 0
            ) + pendingFiles.reduce(
                (n, file) => n + (file.uploadStatus === UStatus.UPLOADED), 0
            );
            const nTotal = pendingPages.length + pendingFiles.length;
            toast('Uploaded ' + nSuccesfulUploads + '/' + nTotal + ' items.',
                  nSuccesfulUploads === nTotal ? 'success' : 'error');
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
            $el('th', null, 'Uploaded'),
        ])),
        $el('tbody', null, items.map(item => $el('tr', null, [
            $el('td', null, item.url),
            $el('td', null, UStatusToStr[item.uploadStatus]),
        ])))
    ]));
}

export {WebsiteGenerateView, WebsiteUploadView, UStatus as UploadStatus};
