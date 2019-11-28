import {services, components} from '../../../rad-commons.js';
const {View, FeatherSvg} = components;
const dataTypes = [
    {name: 'text'},
];

/**
 * #/manage-content-types
 */
class ContentTypesManageView extends preact.Component {
    constructor(props) {
        super(props);
        this.state = {contentTypes: null, openItem: null, doDisableConfirmButton: false};
        services.myFetch('/api/content-types').then(
            res => {
                this.setState({contentTypes: JSON.parse(res.responseText)});
            },
            () => { toast('Failed to fetch content types.', 'error'); }
        );
    }
    render() {
        if (!this.state.contentTypes) return null;
        return $el(View, null, $el('div', null,
            $el('h2', null, 'Manage content types'),
            $el('div', {className: 'list content-types-list'},
                this.state.contentTypes.map(ctype => {
                    const asNormal = !this.state.openItem || this.state.openItem.id !== ctype.id;
                    return $el('div', {className: asNormal ? '' : 'in-edit'},
                        asNormal ? this.buildNormalStateEls(ctype) : this.buildEditStateEls()
                    );
                })
            )
        ));
    }
    buildNormalStateEls(ctype) {
        const fieldRows = [];
        for (const key in ctype.fields) {
            fieldRows.push($el('tr', null,
                $el('td', null, key),
                $el('td', {colspan: 2}, ctype.fields[key])
            ));
        }
        return [
            $el('h3', null, ctype.name,
                $el('button', {onClick: () => this.openForEdit(ctype),
                               className: 'nice-button icon-button small'},
                    $el(FeatherSvg, {iconId: 'edit-2'}),
                    'Edit'
                )
            ),
            $el('table', {className: 'striped'}, fieldRows)
        ];
    }
    buildEditStateEls() {
        const fieldRows = this.state.openItem.fields.map((ir, i) => {
            const className = !ir.isMarkedForDeletion ? '' : 'line-through';
            return $el('tr', null,
                $el('td', null,
                    $el('input', {onInput: e => this.receiveFieldValue(e, i, 'name'),
                                  value: ir.name,
                                  className})
                ),
                $el('td', null,
                    $el('select', {onChange: e => this.receiveFieldValue(e, i, 'dataType'),
                                   value: ir.dataType,
                                   className},
                        dataTypes.map(type =>
                            $el('option', {value: type.name}, type.name)
                        )
                    )
                ),
                $el('td', null,
                    $el('button', {onClick: () => this.toggleIsMarkedForDeletion(i)},
                        !ir.isMarkedForDeletion ? 'Delete' : 'Undo'
                    )
                )
            );
        });
        return [
            $el('div', null,
                $el('input', {onInput: e => this.receiveInputValue(e, name),
                              value: this.state.openItem.name,
                              className: 'h3'}),
                $el('button', {onClick: () => this.handleSubmit(),
                               className: 'nice-button icon-button small',
                               disabled: this.state.doDisableConfirmButton},
                    $el(FeatherSvg, {iconId: 'check'}), 'Save changes'
                ),
                $el('button', {onClick: () => this.cancel(),
                               className: 'text-button'}, 'Cancel')
            ),
            $el('table', {className: 'striped'}, fieldRows),
            $el('button', {onClick: () => this.addField()}, 'Add field')
        ];
    }
    openForEdit(ctype) {
        const fields = [];
        for (const key in ctype.fields) {
            fields.push({name: key, dataType: ctype.fields[key],
                         isMarkedForDeletion: false});
        }
        this.setState({
            openItem: {id: ctype.id, name: ctype.name, fields},
            doDisableConfirmButton: false
        });
    }
    receiveInputValue(e) {
        if (!this.state.openItem) return;
        this.state.openItem.name = e.target.value;
        this.setState({openItem: this.state.openItem});
    }
    receiveFieldValue(e, i, key) {
        this.state.openItem.fields[i][key] = e.target.value;
        this.setState({openItem: this.state.openItem});
    }
    addField() {
        this.state.openItem.fields.push({name: '', dataType: dataTypes[0].name,
                                         isMarkedForDeletion: false});
        this.setState({openItem: this.state.openItem});
    }
    toggleIsMarkedForDeletion(index) {
        const fieldRef = this.state.openItem.fields[index];
        fieldRef.isMarkedForDeletion = !fieldRef.isMarkedForDeletion;
        this.setState({
            openItem: this.state.openItem,
            doDisableConfirmButton: this.state.openItem.fields
                .reduce((c, ir) => c + !ir.isMarkedForDeletion, 0) === 0
        });
    }
    handleSubmit() {
        const ctype = this.state.openItem; // {id, name, fields}
        const fields = ctype.fields.reduce((obj, ir) => {
            if (!ir.isMarkedForDeletion) obj[ir.name] = ir.dataType;
            return obj;
        }, {});
        ctype.fields = JSON.stringify(fields);
        return services.myFetch('/api/content-types', {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            data: JSON.stringify(ctype)
        }).then(() => {
            ctype.fields = fields;
            const oldRef = this.state.contentTypes.find(c => c.id === ctype.id);
            oldRef.name = ctype.name;
            oldRef.fields = fields;
            this.setState({contentTypes: this.state.contentTypes, openItem: null});
            toast('Changes saved', 'success');
        }, () => {
            this.cancel();
            toast('Failed to update content type.', 'error');
        });
    }
    cancel() {
        this.setState({openItem: null});
    }
}

export default ContentTypesManageView;
