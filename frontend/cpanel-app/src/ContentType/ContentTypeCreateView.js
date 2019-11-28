import {components} from '../../../rad-commons.js';
const {View, Form} = components;

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
