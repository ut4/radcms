class Tabs extends preact.Component {
    /**
     * @param {{links: Array<string>; onTabChanged: (idx: number) => any;}} props
     */
    constructor(props) {
        super(props);
        this.state = {currentIdx: 0};
    }
    /**
     * @access protected
     */
    render({links}, {currentIdx}) {
        return <ul class="pl-0 tab">{ links.map((text, i) =>
            <li class={ `tab-item${i !== currentIdx ? '' : ' active'}` }>
                <a onClick={ e => { e.preventDefault(); this.changeTab(i); } }
                    href="#" class="px-2">{ text }</a>
            </li>
        ) }</ul>;
    }
    /**
     * @param {number} toIdx
     * @access public
     */
    changeTab(toIdx) {
        this.setState({currentIdx: toIdx});
        this.props.onTabChanged(toIdx);
    }
}

export default Tabs;
