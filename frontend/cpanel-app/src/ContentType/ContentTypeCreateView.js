import {view, Form} from '../../../src/common-components.js';

/**
 * #/create-content-type
 */
class ContentTypeCreateView extends preact.Component {
    render() {
        return view($el(Form, {onConfirm: e => e},
            $el('h2', null, 'Create content type'),
            $el('p', null, 'todo')
        ));
    }
}

export default ContentTypeCreateView;
