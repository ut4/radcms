class MultiFieldConfigurer extends preact.Component {
    /**
     * @param {todo} props
     */
    constructor(props) {
        super(props);
    }
    /**
     * @access protected
     */
    render() {
        return <div class="multi-field-configurer">
            <div class="main">
                <div>field1</div>
                <div>field2</div>
            </div>
            <button onClick={ () => null }
                    class="nice-button small"
                    type="button">Lisää kenttä</button>
        </div>;
    }
}

export default MultiFieldConfigurer;
