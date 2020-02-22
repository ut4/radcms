import {FeatherSvg} from '@rad-commons';

class FieldList extends preact.Component {
    /**
     * @param {{disallowEdit: bool;}} props
     */
    constructor(props) {
        super(props);
        this.state = {editModeIsOn: false};
    }
    /**
     * @access protected
     */
    render() {
        return <div class={ `list fields ${!this.props.disallowEdit ? '' : 'blurred'}` }>
            { !this.state.editModeIsOn
                ? <button title="Muokkaa kenttiä"
                          class="icon-button configure">
                    <FeatherSvg iconId="settings"/>
                </button>
                : null
            }
            { this.props.fields.map(f => <div class="row">
                <div>{ f.name }</div>
                <div>{ f.dataType }</div>
                { !this.state.editModeIsOn
                    ? null
                    : <div class="buttons">
                        <button title="Muokkaa kenttää"
                                class="text-button">
                            Muokkaa
                        </button>
                        <span> | </span>
                        <button title="Poista kenttä"
                                class="text-button">
                            Poista
                        </button>
                    </div>
                }
            </div>) }
            <div>
                <button title="Lisää kenttä"
                        class="icon-button">
                    <FeatherSvg iconId="plus"/>
                </button>
            </div>
        </div>;
    }
}

export default FieldList;
