import FeatherSvg from './FeatherSvg.jsx';

class Toaster extends preact.Component {
    /**
     * @param {{autoCloseTimeoutMillis?: number; publishFactoryTo?: Object;}} props
     */
    constructor(props) {
        super(props);
        (props.publishFactoryTo || window).toast = this.addMessage.bind(this);
        this.autoCloseTimeoutMillis = props.autoCloseTimeoutMillis || 8000;
        this.state = {messages: []};
    }
    /**
     * @param {string|function} message
     * @param {string} level
     */
    addMessage(message, level) {
        this.state.messages.unshift({message, level,
            timeoutId: setTimeout(this.removeMessage.bind(this),
                                  this.autoCloseTimeoutMillis)});
        this.setState({messages: this.state.messages});
    }
    /**
     * @param {{message: string|function; level: string; timeoutId: number;}?} message
     */
    removeMessage(message) {
        const messages = this.state.messages;
        if (!message) { // from timeout
            messages.pop();
        } else { // from onClick
            clearTimeout(message.timeoutId);
            messages.splice(messages.indexOf(message), 1);
        }
        this.setState({messages});
    }
    /**
     * @access protected
     */
    render() {
        if (!this.state.messages.length) return;
        return <div class="toaster">{
            this.state.messages.map(message => {
                let iconId = 'check';
                if (message.level === 'error') iconId = 'alert-triangle';
                if (message.level === 'info') iconId = 'info';
                return <div class={ 'toaster-message ' + message.level }
                            onClick={ () => this.removeMessage(message) }>
                    <FeatherSvg iconId={ iconId }/>
                    { typeof message.message !== 'function'
                        ? preact.createElement('span', null, message.message)
                        : preact.createElement(message.message) }
                </div>;
            })
        }</div>;
    }
}

export default Toaster;
