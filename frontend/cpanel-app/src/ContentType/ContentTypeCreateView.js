import {View, Form} from '../../../src/common-components.js';

/**
 * #/create-content-type
 */
class ContentTypeCreateView extends preact.Component {
    render() {
        return $el(View, null, $el(Form, {onConfirm: e => e},
            $el('h2', null, 'Create content type'),
            $el('p', null, 'todo')
        ));
    }
}

export default ContentTypeCreateView;
