import {WebsiteListView, WebsiteCreateView, WebsiteImportView} from './app-website-views.js';
import {Toaster, featherSvg} from '../../src/common-components.js';

/**
 * The root component of app.html.
 */
class App extends preact.Component {
    constructor(props) {
        super(props);
        this.state = {showAdvanced: true};
    }
    render() {
        return $el('div', null,
            $el(Toaster, null, null),
            $el('nav', {id: 'main-menu', className: 'box no-highlight-stripe'},
                $el('h1', null, 'RadCMS'),
                $el('a', {href: '#/import-website'}, featherSvg('package'), 'Import website'),
                $el('button', {className: 'text-button',
                               onClick: () => this.toggleShowAdvancedButtons()},
                    'Advanced',
                    featherSvg('chevron-' + (this.state.showAdvanced ? 'up' : 'down'))
                ),
                $el('div', {className: this.state.showAdvanced ? '' : 'hidden'},
                    $el('a', {href: '#/create-website'}, featherSvg('folder-plus'), 'Create website')
                )
            ),
            $el(preactRouter,
                {history: History.createHashHistory()},
                $el(WebsiteListView, {path: '/'}, null),
                $el(WebsiteCreateView, {path: '/create-website'}, null),
                $el(WebsiteImportView, {path: '/import-website'}, null)
            )
        );
    }
    toggleShowAdvancedButtons() {
        this.setState({showAdvanced: !this.state.showAdvanced});
    }
}

export {App};
