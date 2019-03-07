import {WebsiteListView, WebsiteCreateView, WebsiteImportView} from './app-website-views.js';

/**
 * The root component of app.html.
 */
class App extends preact.Component {
    render() {
        return $el('div', null,
            $el('nav', {id: 'main-menu'},
                $el('h1', null, 'InsaneCMS'),
                $el('a', {href: '#/import-website'}, 'Import website'),
                $el('span', null, 'Advanced'),
                $el('a', {href: '#/create-website'}, 'Create website')
            ),
            $el(preactRouter,
                {history: History.createHashHistory()},
                $el(WebsiteListView, {path: '/'}, null),
                $el(WebsiteCreateView, {path: '/create-website'}, null),
                $el(WebsiteImportView, {path: '/import-website'}, null)
            )
        );
    }
}

export {App};