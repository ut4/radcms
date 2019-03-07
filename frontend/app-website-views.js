import {Form} from './common-components.js';
import services from './common-services.js';

/**
 * #/: Lists websites returned by GET /api/website.
 */
class WebsiteListView extends preact.Component {
    constructor(props) {
        super(props);
        this.state = {websites: null};
        services.myFetch('/api/website').then(
            res => { this.setState({websites: JSON.parse(res.responseText)}); },
            () => { toast('Failed to fetch the website list', 'error'); }
        );
    }
    render() {
        let content = [];
        if (this.state.websites !== null && this.state.websites.length > 0) {
            content.push(...this.state.websites.map(site =>
                $el('div', null, $el('div', null,
                    $el('h3', null, site.name || 'untitled'),
                    $el('ul', null,
                        $el('li', null,
                            $el('h4', null, $el('img', {src: '/frontend/assets/icon-sprite.svg#folder'}, null), 'Location'),
                            site.dirPath
                        ),
                        $el('li', null,
                            $el('h4', null, $el('img', {src: '/frontend/assets/icon-sprite.svg#clock'}, null), 'Created at'),
                            new Date(site.createdAt * 1000).toLocaleString()
                        )
                    ),
                    $el('button', {onClick: () => this.openWebsite(site.dirPath)},
                        'Start editing')
                ))
            ));
        }
        content.push($el('div', null, $el('div', null,
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
        services.myFetch('/api/set-current-website', {
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
    render() {
        return $el(Form, {onConfirm: e => this.confirm(e)},
            $el('h2', null, 'Create website'),
            $el('button', null, 'Create')
        );
    }
    confirm() {
        throw new Error('Not implemented yet');
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