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
                                  ' pages to "', g.sitePath, g.outDir,
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
                       g.sitePath, g.outDir, '" in ', g.tookSecs.toFixed(6),
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

const USTATUS_NOT_UPLOADED = "No";
const USTATUS_UPLOADED = "Yes";
const USTATUS_UPLOADING = "Uploading...";
const USTATUS_ERROR = "Error";

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
            statuses: []
        };
        services.myFetch('/api/website/pages').then(
            res => {
                const pages = JSON.parse(res.responseText);
                this.setState({pages, statuses: pages.map(() => ({
                    status: USTATUS_NOT_UPLOADED
                }))});
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
                    $el('tbody', null, this.state.pages.map((page, i) => $el('tr', null, [
                        $el('td', null, page.url),
                        $el('td', null, this.state.statuses[i].status),
                    ])))
                ])) : ''
            ])
        ));
    }
    receiveInputValue(name, e) {
        this.setState({[name]: e.target.value});
    }
    confirm() {
        this.setState({uploading: true, statuses: this.state.statuses.map(
            s => { s.status = USTATUS_UPLOADING; return s; }
        )});
        services.myFetch('/api/website/upload', {
            method: 'POST',
            headers: {'Content-Type': 'application/x-www-form-urlencoded'},
            data: 'remoteUrl=' + encodeURIComponent(this.state.remoteUrl) +
                    '&username=' + encodeURIComponent(this.state.username) +
                    '&password=' + encodeURIComponent(this.state.password),
            progress: (res, percent) => {
                if (!res.responseText.length) return;
                const statuses = this.state.statuses;
                const pcs = res.responseText.split('\r\n');
                // Note: loops all chunks every time, because backend may return
                // multiple chunks at once
                for (let i = 0; i < pcs.length - 1; i += 2) {
                    const [url, uploadResult] = pcs[i + 1].split('|');
                    const idx = this.state.pages.findIndex(p => p.url === url);
                    statuses[idx].status = uploadResult === '000' ? USTATUS_UPLOADED : USTATUS_ERROR;
                }
                this.setState({statuses});
            }
        }).then(() => {
            this.setState({uploading: false});
            const nSuccesfulUploads = this.state.statuses.reduce(
                (n, status) => n + (status.status === USTATUS_UPLOADED), 0
            );
            const nTotal = this.state.pages.length;
            toast('Uploaded ' + nSuccesfulUploads + '/' + nTotal + ' pages.',
                  nSuccesfulUploads === nTotal ? 'success' : 'error');
        }, () => {
            toast('Failed to upload pages.', 'error');
        });
    }
}

export {WebsiteGenerateView, WebsiteUploadView};
