import {Form, featherSvg} from '../../src/common-components.js';
import {FileDialog} from '../../src/file-dialog.js';
import services from '../../src/common-services.js';

/**
 * #/: Lists websites returned by GET /api/websites.
 */
class WebsiteListView extends preact.Component {
    constructor(props) {
        super(props);
        this.state = {websites: null};
        services.myFetch('/api/websites').then(
            res => { this.setState({websites: JSON.parse(res.responseText)}); },
            () => { toast('Failed to fetch the website list', 'error'); }
        );
    }
    render() {
        let content = [];
        if (this.state.websites !== null && this.state.websites.length > 0) {
            content.push(...this.state.websites.map(site =>
                $el('div', null, $el('div', {className: 'box'},
                    $el('h3', null, site.name || 'untitled'),
                    $el('ul', null,
                        $el('li', null,
                            $el('h4', null, featherSvg('hard-drive'), 'Location'),
                            $el('span', null, site.dirPath)
                        ),
                        $el('li', null,
                            $el('h4', null, featherSvg('clock'), 'Created at'),
                            $el('span', null, new Date(site.createdAt * 1000).toLocaleString())
                        )
                    ),
                    $el('button', {onClick: () => this.openWebsite(site.dirPath),
                        className: 'nice-button icon-button nice-button-primary'},
                        featherSvg('edit'), 'Start editing')
                ))
            ));
        }
        content.push($el('div', null, $el('div', {className: 'box'},
            $el('a', {href: '#/import-website'}, 'Import website')
        )));
        return $el('div', null,
            $el('h2', null, 'My websites'),
            $el('div', {id: 'website-list', className: 'website-list'}, ...content)
        );
    }
    /**
     * Sets the website located at $dirPath as the active website, and then
     * redirects to its home page.
     */
    openWebsite(dirPath) {
        services.myFetch('/api/websites/set-current', {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            data: JSON.stringify({dirPath})
        }).then(() => {
            window.location.href = '/';
        }, () => {
            toast('Failed to open the website.', 'error');
        });
    }
}

/**
 * #/create-website.
 */
class WebsiteCreateView extends preact.Component {
    constructor(props) {
        super(props);
        this.fileDialog = null;
        this.state = {
            sampleDataOptions: [],
            dirPath: '/path/to/local/dir/',
            name: 'mysite.com',
            sampleDataName: 'minimal'
        };
        services.myFetch('/api/websites/sample-content-types').then(
            res => {
                this.setState({sampleDataOptions: JSON.parse(res.responseText)});
            },
            () => {
                toast('Failed to fetch the sample data list', 'error');
            }
        );
    }
    render() {
        return $el(Form, {onConfirm: e => this.confirm(e), confirmButtonText: 'Create'},
            $el('h2', null, 'Create website'),
            $el('div', {className: 'view-content box'},
                $el('label', null,
                    $el('span', {'data-help-text': 'Sivustoprojektin nimi, ei pakollinen.'}, 'Nimi'),
                    $el('input', {name: 'name', onChange: e => Form.receiveInputValue(e, this),
                                  value: this.state.name}, null)
                ),
                $el('label', null,
                    $el('span', {'data-help-text': 'Lokaali kansio, joka sisältää tämän sivustoprojektin templaatit sekä konfiguraatio-, ja datatiedostot.'}, 'Kansio'),
                    $el('input', {name: 'dirPath', onChange: e => Form.receiveInputValue(e, this),
                                  value: this.state.dirPath, onClick: () => this.fileDialog.open()}, null)
                ),
                $el('label', null,
                    $el('span', {'data-help-text': 'Sisällön nimi, jolla tämä sivustoprojekti alustetaan.'}, 'Alustava sisältö'),
                    $el('select', {value: this.state.sampleDataName,
                                   name: 'sampleDataName',
                                   onChange: e => Form.receiveInputValue(e, this)},
                        this.state.sampleDataOptions.map(option =>
                            $el('option', {value: option.name}, option.name)
                        ))
                )
            ),
            $el(FileDialog, {
                provideDirListFn: path => services.myFetch('/api/file/list-dir', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    data: JSON.stringify({path})
                }).then(res => JSON.parse(res.responseText)),
                onConfirm: dirPath => { this.setState({dirPath}); },
                ref: cmp => { this.fileDialog = cmp; }
            }, null)
        );
    }
    confirm() {
        services.myFetch('/api/websites', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            data: JSON.stringify({
                name: this.state.name,
                dirPath: this.state.dirPath,
                sampleDataName: this.state.sampleDataName
            })
        }).then(() => {
            preactRouter.route('/');
        }, () => {
            toast('Failed to create the website.', 'error');
        });
    }
}

/**
 * #/import-website.
 */
class WebsiteImportView extends preact.Component {
    render() {
        return $el(Form, {onConfirm: e => this.confirm(e)},
            $el('h2', null, 'Import website'),
            $el('button', null, 'Import')
        );
    }
    confirm() {
        throw new Error('Not implemented yet');
    }
}

export {WebsiteListView, WebsiteCreateView, WebsiteImportView};