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
            pages: []
        };
        services.myFetch('/api/website/pages').then(
            res => {
                this.setState({pages: JSON.parse(res.responseText)});
            },
            () => { toast('Failed to fetch pages.', 'error'); }
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
                this.state.pages.length ? $el('div', null, $el('table', {className: 'striped'}, [
                    $el('thead', null, $el('tr', null, [
                        $el('th', null, 'Page'),
                        $el('th', null, 'Uploaded'),
                    ])),
                    $el('tbody', null, this.state.pages.map(page => $el('tr', null, [
                        $el('td', null, page.url),
                        $el('td', null, UStatusToStr[page.uploadStatus]),
                    ])))
                ])) : ''
            ])
        ));
    }
    receiveInputValue(name, e) {
        this.setState({[name]: e.target.value});
    }
    confirm() {
        const pendingPages = [];
        this.setState({uploading: true, pages: this.state.pages.map(page => {
            if (page.uploadStatus != UStatus.UPLOADED) {
                page.uploadStatus = UStatus.UPLOADING;
                pendingPages.push(page);
            }
            return page;
        })});
        services.myFetch('/api/website/upload', {
            method: 'POST',
            headers: {'Content-Type': 'application/x-www-form-urlencoded'},
            data: 'remoteUrl=' + encodeURIComponent(this.state.remoteUrl) +
                    '&username=' + encodeURIComponent(this.state.username) +
                    '&password=' + encodeURIComponent(this.state.password),
            progress: (res, percent) => {
                if (!res.responseText.length) return;
                const pages = this.state.pages;
                const pcs = res.responseText.split('\r\n');
                // Note: loops all chunks every time, because backend may return
                // multiple chunks at once
                for (let i = 0; i < pcs.length - 1; i += 2) {
                    const [url, uploadResult] = pcs[i + 1].split('|');
                    const idx = this.state.pages.findIndex(p => p.url === url);
                    pages[idx].uploadStatus = uploadResult === '0' ? UStatus.UPLOADED : UStatus.ERROR;
                }
                this.setState({pages});
            }
        }).then(() => {
            this.setState({uploading: false});
            const nSuccesfulUploads = pendingPages.reduce(
                (n, page) => n + (page.uploadStatus === UStatus.UPLOADED), 0
            );
            const nTotal = pendingPages.length;
            toast('Uploaded ' + nSuccesfulUploads + '/' + nTotal + ' pages.',
                  nSuccesfulUploads === nTotal ? 'success' : 'error');
        }, () => {
            toast('Failed to upload pages.', 'error');
        });
    }
}

export {WebsiteGenerateView, WebsiteUploadView, UStatus as UploadStatus};
