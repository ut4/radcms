import {http, View, Input, FeatherSvg} from '@rad-commons';
import FieldList from './FieldList.jsx';

/**
 * #/manage-content-types
 */
class ContentTypesManageView extends preact.Component {
    /**
     * @param {Object} props
     */
    constructor(props) {
        super(props);
        this.state = {contentTypes: null, message: ''};
        http.get('/api/content-types')
            .then(contentTypes => {
                if (contentTypes.length) this.setState({contentTypes});
                else this.setState({message: 'Sisältötyyppejä ei löytynyt'});
            })
            .catch(() => {
                this.setState({message: 'Jokin meni pieleen'});
            });
    }
    /**
     * @access protected
     */
    render() {
        return <View><div>
            <h2>Sisältötyypit <a
                                 class="icon-only"
                                 title="Luo uusi sisältötyyppi">
                                  <FeatherSvg iconId="plus-circle" className="small"/>
                              </a></h2>
            { this.state.contentTypes
                ? <div class="item-grid">{ this.state.contentTypes.map(t =>
                    <ContentTypesManageView.ContentTypeCard
                        contentType={ t }
                        key={ t.name }/>
                ) }</div>
                : !this.state.message
                    ? null
                    : <p>{ this.state.message}</p>
            }
        </div></View>;
    }
}

ContentTypesManageView.ContentTypeCard = class extends preact.Component {
    /**
     * @param {{contentType: ContentType;}} props
     */
    constructor(props) {
        super(props);
        this.state = {isBeingEdited: false,
                      name: props.contentType.name,
                      friendlyName: props.contentType.friendlyName,
                      isInternal: props.contentType.isInternal};
    }
    /**
     * @access protected
     */
    render() {
        if (!this.state.isBeingEdited) return <div class="box">
            <header>
                <h3>{ this.state.name }</h3>
                <div>
                    <button onClick={ () => this.beginEdit() }
                            title="Muokkaa sisältötyyppiä"
                            class="icon-button">
                        <FeatherSvg iconId="edit"/>
                    </button>
                    <button onClick={ () => this.showDeleteDialog() }
                            title="Poista sisältötyyppi"
                            class="icon-button">
                        <FeatherSvg iconId="x"/>
                    </button>
                </div>
            </header>
            <div class="list left-aligned">
                <div class="row">Selkonimi: { this.state.friendlyName }</div>
                <div class="row">Sisäinen: { !this.state.isInternal ? 'ei' : 'kyllä' }</div>
            </div>
            <FieldList fields={ this.props.contentType.fields } />
        </div>;
        //
        return <div class="box">
            <header>
                <Input className="h3" value={ this.state.name }/>
                <div>
                    <button onClick={ () => this.endEdit() }
                            title="Tallenna"
                            class="icon-button">
                        <FeatherSvg iconId="save"/>
                    </button>
                </div>
            </header>
            <div><input type="checkbox"/> Sisäinen</div>
            <FieldList fields={ this.props.contentType.fields } disallowEdit={ true }/>
        </div>;
    }
    /**
     * @access private
     */
    beginEdit() {
        this.setState({isBeingEdited: true});
    }
    /**
     * @access private
     */
    endEdit() {
        this.setState({isBeingEdited: false});
    }
};



export default ContentTypesManageView;
