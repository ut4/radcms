import {Form, featherSvg} from './common-components.js';

const DOUBLE_CLICK_TIME_WINDOW = 250; // ms

class FileDialog extends preact.Component {
    /**
     * @param {Object} props {
     *     provideDirListFn: (path: string): Promise<{
     *         root: string;
     *         entries: {name: string; isDir: string;}[]
     *     }>;
     *     onConfirm: (path: string): any;
     * }
     */
    constructor(props) {
        super(props);
        if (typeof props.provideDirListFn != 'function')
            throw new TypeError('props.provideDirListFn must be a function');
        if (typeof props.onConfirm != 'function')
            throw new TypeError('props.onConfirm must be a function');
        this.state = {
            mainPanelTree: null,
            selectedPath: null,
            isOpen: false
        };
        this.lastClick = 0;
    }
    open() {
        this.setState({isOpen: true});
        this.props.provideDirListFn('$HOME').then(dir => {
            this.setState({mainPanelTree: dir});
        });
    }
    render() {
        if (!this.state.isOpen) return;
        return $el('div', {className: 'file-dialog-outer'},
            $el('div', {className: 'file-dialog box no-highlight-stripe'},
                $el('h3', null, 'Select a directory'),
                $el('div', {className: 'top'},
                    $el('button', {onClick: () => this.loadParentDir(),
                                   disabled: !this.currentRootHasParentDir(),
                                   type: 'button'}, featherSvg('arrow-up')),
                    this.makeClickablePath()
                ),
                $el('div', {className: 'main'}, this.makeMainPanel()),
                $el('div', {className: 'bottom'},
                    $el('label', {className: 'inline'},
                        $el('span', null, 'Selected:'),
                        $el('input', {onInput: e => Form.receiveInputValue(e, this),
                                      name: 'selectedPath',
                                      value: this.state.selectedPath}, null)
                    ),
                    $el('button', {onClick: () => this.confirmSelection(),
                                   type: 'button',
                                   className: 'nice-button nice-button-primary',
                                   disabled: !this.state.selectedPath}, 'Ok'),
                    $el('button', {onClick: () => this.closeDialog(),
                                   type: 'button',
                                   className: 'text-button'}, 'Cancel')
                )
            )
        );
    }
    makeMainPanel() {
        if (!this.state.mainPanelTree) return;
        return $el('ul', null, this.state.mainPanelTree.entries.map(entry =>
            $el('li', {onClick: () => { this.handleEntryClick(entry); }}, entry.name)
        ));
    }
    makeClickablePath() {
        if (!this.state.mainPanelTree) return;
        const segments = this.state.mainPanelTree.root.split('/');
        segments.pop(); // trailing slash
        return $el('div', null, segments.map((seg, i) => {
            const cur = segments.slice(0, i + 1).join('/');
            return $el('button', {onClick: () => this.loadToMainPanel(cur),
                                  type: 'button'}, seg);
        }));
    }
    handleEntryClick(entry) {
        if ((performance.now() - this.lastClick) < DOUBLE_CLICK_TIME_WINDOW) { // double-click
            this.loadToMainPanel(this.state.mainPanelTree.root + entry.name);
        } else { // single
            this.setState({selectedPath: this.state.mainPanelTree.root + entry.name});
        }
        this.lastClick = performance.now();
    }
    currentRootHasParentDir() {
        return this.state.mainPanelTree && getParentDir(this.state.mainPanelTree.root) != null;
    }
    loadParentDir() {
        const parentPath = getParentDir(this.state.mainPanelTree.root);
        if (!parentPath) return;
        this.loadToMainPanel(parentPath);
    }
    loadToMainPanel(path) {
        if (path == this.state.mainPanelTree.root) return;
        this.props.provideDirListFn(path).then(dir => {
            this.setState({mainPanelTree: dir});
        });
    }
    confirmSelection() {
        this.props.onConfirm(this.state.selectedPath);
        this.closeDialog();
    }
    closeDialog() {
        this.setState({isOpen: false});
    }
}

function getParentDir(path) {
    const pcs = path.split('/').filter(p => p != '');
    return pcs.length > 1 ? pcs.slice(0, pcs.length - 1).join('/') : null;
}

export {FileDialog};
