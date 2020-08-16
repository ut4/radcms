import {FeatherSvg} from '@rad-commons';

class Tags extends preact.Component {
    /**
     * @param {{tags: Array<string>; onTagRemoved: (tag: text) => any; onAddTagButtonClicked: () => any;}} props
     */
    constructor(props) {
        super(props);
        this.state = {tags: props.tags};
    }
    /**
     * @access public
     */
    addTag(text) {
        this.setState({tags: this.state.tags.concat(text)});
    }
    /**
     * @access protected
     */
    render() {
        return <div>
            { this.state.tags.map(text =>
                <span class="chip">
                    { text }
                    <button
                        onClick={ () => this.removeTag(text) }
                        class="btn btn-clear"
                        type="button"></button>
                </span>
            ) }
            <button class="chip btn" onClick={ () => this.props.onAddTagButtonClicked() } type="button">
                <FeatherSvg iconId="plus" className="feather-xs"/>
                Lisää
            </button>
        </div>;
    }
    /**
     * @access private
     */
    removeTag(text) {
        // Preventoi ei-haluttu "Lisää"-napin klikkautuminen
        setTimeout(() => {
            this.setState({tags: this.state.tags.filter(t => t !== text)});
            this.props.onTagRemoved(text);
        }, 10);
    }
}

export default Tags;
