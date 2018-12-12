import services from './common-services.js';
import {Form} from './common-components.js';

/**
 * #/generate-website.
 */
class WebsiteGenerateView extends preact.Component {
    constructor(props) {
        super(props);
        this.state = {genDetails: null, unexpectedError: null};
    }
    render() {
        let content;
        const g = this.state.genDetails;
        if (!g) {
            content = 'Generate the website to local directory \'<todo>/out/\'?';
        } else if (!this.unexpectedError) {
            content = [
                $el('div', null, ['Wrote ', g.wrotePagesNum, '/', g.totalPages,
                                  ' pages to "', g.targetRoot, g.targetDir,
                                  '", but had the following issues:'].join('')),
                g.issues.map(str => {
                    const [url, ...message] = str.split('>');
                    return $el('div', null, url + ': ' + message.join('>'));
                })
            ];
        } else {
            content = this.state.unexpectedError;
        }
        return $el('div', {className: 'view'}, $el('div', null,
            $el(Form, {onConfirm: () => this.confirm(), noAutoClose: true}, [
                $el('h2', null, 'Generate website'),
                $el('div', null, content)
            ])
        ));
    }
    confirm() {
        services.myFetch('/api/website/generate', {
            method: 'POST',
            headers: {'Content-Type': 'application/x-www-form-urlencoded'},
            data: 'a=b'
        }).then(req => {
            const g = JSON.parse(req.responseText);
            if (!g.issues.length) {
                toast(['Wrote ', g.wrotePagesNum, '/', g.totalPages, ' pages to "',
                       g.targetRoot, g.targetDir, '" in ', g.tookSecs.toFixed(6),
                       ' secs.'].join(''), 'success');
                myRedirect('/');
            } else {
                this.setState({genDetails: JSON.parse(req.responseText)});
            }
        }, req => {
            this.setState({unexpectedError: req.responseText});
        });
    }
}

export {WebsiteGenerateView};
