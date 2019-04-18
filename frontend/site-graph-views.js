import services from './common-services.js';
import {view, Form} from './common-components.js';

/**
 * #/edit-site-graph.
 */
class SiteGraphEditView extends preact.Component {
    constructor(props) {
        super(props);
        this.state = {pages: null, numDeletables: 0};
        services.myFetch('/api/websites/current/site-graph').then(
            res => {
                this.setState({pages: JSON.parse(res.responseText).pages.map(
                    p => { p.doDelete = false; return p; }
                )});
            },
            () => { toast('Failed to fetch the site graph.', 'error'); }
        );
    }
    render() {
        return view($el(Form, {onConfirm: () => this.confirm(),
                               doDisableConfirmButton: () => this.state.numDeletables == 0,
                               confirmButtonText: 'Save changes'},
            $el('h2', null, 'Edit site graph'),
            this.state.pages && $el('table', {className: 'striped'},
                $el('thead', null, $el('tr', null,
                    $el('th', null, 'Url'),
                    $el('th', null, '')
                )),
                $el('tbody', null, this.state.pages.map((page, i) =>
                    $el('tr', {className: !page.doDelete ? '' : 'line-through'},
                        $el('td', null, page.url),
                        $el('td', null, $el('button', {
                            onClick: () => { this.handleSetDeletableClick(i); },
                            type: 'button'
                        }, !page.doDelete ? 'Delete' : 'Undo'))
                    )
                ))
            )
        ));
    }
    handleSetDeletableClick(index) {
        const newStatus = !this.state.pages[index].doDelete;
        this.state.pages[index].doDelete = newStatus; // false->true, true->false
        this.setState({
            pages: this.state.pages,
            numDeletables: this.state.numDeletables + (newStatus ? 1 : -1)
        });
    }
    confirm() {
        services.myFetch('/api/websites/current/site-graph', {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            data: JSON.stringify({
                deleted: this.state.pages.filter(p => p.doDelete).map(p => p.url)
            })
        }).then(() => {
            toast('Updated the site graph.', 'success');
            return services.myFetch('/api/websites/current/num-waiting-uploads');
        }, () => {
            toast('Failed the update the site graph.', 'error');
        }).then(res => {
            services.signals.emit('numWaitingUploadsChanged',
                () => parseInt(res.responseText));
        });
    }
}

export {SiteGraphEditView};
