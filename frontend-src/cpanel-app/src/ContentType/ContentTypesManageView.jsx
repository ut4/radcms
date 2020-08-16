import {http, toasters, env, urlUtils, View, FeatherSvg} from '@rad-commons';
import getFieldListImplForEditMode, {makeField} from './FieldLists.jsx';
import BasicInfoInputs from './BasicInfoInputs.jsx';
let counter = 0;

/**
 * #/manage-content-types[?auto-open-create-form=any]: Näkymä, jossa devaaja voi
 * selata/lisätä/muokata sivuston sisältötyyppejä.
 */
class ContentTypesManageView extends preact.Component {
    /**
     * @param {Object} props
     */
    constructor(props) {
        super(props);
        this.state = {contentTypes: null,
                      contentTypeCurrentlyBeingEdited: null, // or created
                      fieldsCurrentlyBeingEdited: null,
                      message: ''};
        this.basicInfoEditModes = [];
        this.fieldEditModes = [];
        this.fieldLists = [];
        http.get('/api/content-types')
            .then(contentTypes => {
                if (contentTypes.length) {
                    contentTypes.forEach(t => {
                        this.basicInfoEditModes.push('none');
                        this.fieldEditModes.push('none');
                        this.fieldLists.push(preact.createRef());
                        Object.assign(t, {
                            key: ++counter,
                            fields: t.fields.map(f => Object.assign(f, {key: makeField().key}))
                        });
                    });
                    this.setState({contentTypes});
                    if (props.matches['auto-open-create-form'] !== undefined) {
                        window.history.replaceState(null, null, window.location.hash.split('?')[0]);
                        this.prependNewContentType(contentTypes);
                    }
                } else this.setState({message: 'Sisältötyyppejä ei löytynyt'});
            })
            .catch(err => {
                env.console.error(err);
                this.setState({message: 'Jokin meni pieleen'});
            });
    }
    /**
     * @access protected
     */
    render() {
        return <View>
            <h2>Sisältötyypit
                <button onClick={ () => this.prependNewContentType() }
                        class={ `btn btn-icon${!this.state.fieldsCurrentlyBeingEdited ? '' : ' disabled'}` }
                        title="Luo uusi sisältötyyppi">
                    <FeatherSvg iconId="plus-circle" className="medium"/>
                </button>
            </h2>
            { this.state.contentTypes
                ? <div class="item-grid two">{ this.state.contentTypes.map((t, i) => {
                    const useNormalWidth = this.basicInfoEditModes[i] === 'none' &&
                                           this.fieldEditModes[i] === 'none';
                    const ListCmp = getFieldListImplForEditMode(this.fieldEditModes[i]);
                    const blur = (this.state.contentTypeCurrentlyBeingEdited &&
                                  this.state.contentTypeCurrentlyBeingEdited !== t) ||
                                  this.state.fieldsCurrentlyBeingEdited !== null;
                    return <div class={ `panel bg-light${useNormalWidth ? '' : ' full-width'}${!blur ? '' : ' blurred'}` }
                                style={ useNormalWidth ? '' : `grid-row:${Math.floor(i / 2 + 1)}` }>
                        <BasicInfoInputs
                            contentType={ t }
                            editMode={ this.basicInfoEditModes[i] }
                            blur={ blur }
                            onEditStarted={ () => this.setBasicInfoEditModeOn(t, i) }
                            onEditEnded={ (mode, data) => this.confirmBasicInfoEdit(mode, data, i) }
                            onEditDiscarded={ mode => this.discardBasicInfoEdit(mode) }
                            key={ t.key }/>
                        <ListCmp
                            fields={ t.fields }
                            blur={ (this.state.contentTypeCurrentlyBeingEdited &&
                                    this.fieldEditModes[i] !== 'create') ||
                                    (this.state.fieldsCurrentlyBeingEdited &&
                                    this.state.fieldsCurrentlyBeingEdited !== t) }
                            contentType={ t }
                            setEditMode={ to => {
                                if (this.fieldEditModes[i] === 'edit' && to === 'none')
                                    t.fields = this.fieldLists[i].current.getFields();
                                this.fieldEditModes = this.fieldEditModes.map((_, i2) => i2 !== i ? 'none' : to);
                                this.setState({fieldsCurrentlyBeingEdited: to !== 'none' ? t : null});
                            } }
                            ref={ this.fieldLists[i] }
                            key={ t.key }/>
                    </div>;
                }) }</div>
                : !this.state.message
                    ? null
                    : <p>{ this.state.message}</p>
            }
        </View>;
    }
    /**
     * @access private
     */
    setBasicInfoEditModeOn(contentType, idx) {
        this.basicInfoEditModes[idx] = 'edit';
        this.setState({contentTypeCurrentlyBeingEdited: contentType});
    }
    /**
     * @access private
     */
    confirmBasicInfoEdit(mode, data, idx) {
        (mode === 'create'
            ? http.post('/api/content-types', Object.assign(data,
                {fields: this.fieldLists[idx].current.getFields()}
            ))
            : http.put(`/api/content-types/${this.state.contentTypes[idx].name}`, data)
        )
        .then(() => {
            urlUtils.reload();
        })
        .catch(err => {
            env.console.error(err);
            toasters.main('Sisältötyypin ' + (mode === 'create' ? 'luonti' : 'päivitys') +
                          ' epäonnistui.', 'error');
        });
    }
    /**
     * @access private
     */
    discardBasicInfoEdit(mode) {
        this.basicInfoEditModes = this.basicInfoEditModes.map(() => 'none');
        this.fieldEditModes = this.fieldEditModes.map(() => 'none');
        const newState = {contentTypeCurrentlyBeingEdited: null,
                          fieldsCurrentlyBeingEdited: null};
        if (mode === 'create') {
            newState.contentTypes = this.state.contentTypes.slice(1);
            this.basicInfoEditModes.shift();
            this.fieldLists.shift();
        }
        this.setState(newState);
    }
    /**
     * @access private
     */
    prependNewContentType(contentTypes = this.state.contentTypes) {
        contentTypes.unshift({
            name: 'Name',
            friendlyName: 'Nimi',
            description: 'Kuvaus',
            isInternal: false,
            fields: [makeField()],
            key: ++counter
        });
        this.basicInfoEditModes = ['create'].concat(this.basicInfoEditModes.map(() => 'none'));
        this.fieldEditModes = ['create'].concat(this.fieldEditModes.map(() => 'none'));
        this.fieldLists.unshift(preact.createRef());
        this.setState({contentTypes,
                       contentTypeCurrentlyBeingEdited: contentTypes[0],
                       fieldsCurrentlyBeingEdited: contentTypes[0]});
    }
}

export default ContentTypesManageView;
