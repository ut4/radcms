import {contentFormRegister} from '@rad-cpanel-commons';
const ValidatingFormImpl = contentFormRegister.getImpl('ValidatingForm');

/**
 * Implementoi lomakkeen RadForms-tyyppiselle sisällölle: luo virtuaaliset lomake-
 * kentät (this.combinedVirtualFields), passaa ne ValidatingFormImpl-komponentille,
 * joka validoi ne automaattisesti.
 */
class RadFormsContentForm extends ValidatingFormImpl {
    /**
     * @inheritdoc
     */
    constructor(props) {
        super(props);
        this.combinedVirtualFieldsForm = preact.createRef();
        this.setupVirtualFormFields(props);
    }
    /**
     * @inheritdoc
     */
    submit(e) {
        const combinedValues = this.combinedVirtualFieldsForm.current.submit(e);
        if (!combinedValues)
            return combinedValues;
        const newSendMailBehaviour = Object.assign(this.sendMailBehaviour,
            {data: virtualContentNodeToBehaviourData(combinedValues)});
        return {name: combinedValues.name, behaviours: JSON.stringify([newSendMailBehaviour])};
    }
    /**
     * @access protected
     */
    componentWillReceiveProps(props) {
        this.setupVirtualFormFields(props);
    }
    /**
     * @access protected
     */
    render({getWidgetImpl}) {
        return <ValidatingFormImpl
            fields={ this.combinedVirtualFields }
            values={ this.combinedVirtualFormValues }
            getWidgetImpl={ getWidgetImpl }
            settings={ {} }
            fieldHints={ [] }
            ref={ this.combinedVirtualFieldsForm }/>;
    }
    /**
     * @access private
     */
    setupVirtualFormFields(props) {
        const behaviours = JSON.parse(props.values.behaviours);
        this.sendMailBehaviour = behaviours[0];
        const sendMailBehaviourVirtualFields = behaviourDataToMultiFields(this.sendMailBehaviour.data);
        //
        const nameFieldOnly = [Object.assign({value: props.values.name || ''}, props.fields[0])];
        this.combinedVirtualFields = nameFieldOnly.concat(sendMailBehaviourVirtualFields);
        this.combinedVirtualFormValues = makeVirtualContentNode(this.combinedVirtualFields);
    }
}

function behaviourDataToMultiFields(data) {
    return [
        {name: 'Aihetemplaatti', value: data.subjectTemplate,
         validationRules: [['required']],
         widget: {name: 'textField', args: {}}},
        {name: 'Vastaanottaja', value: data.toAddress,
         validationRules: [['required']],
         widget: {name: 'textField', args: {}}},
        {name: 'Lähettäjä', value: data.fromAddress,
         validationRules: [['required']],
         widget: {name: 'textField', args: {}}},
        {name: 'Sisältötemplaatti', value: data.bodyTemplate,
         validationRules: [['required']],
         widget: {name: 'textArea', args: {}}},
    ];
}

function virtualContentNodeToBehaviourData(virtualContentNode) {
    return {
        subjectTemplate: virtualContentNode['Aihetemplaatti'],
        toAddress: virtualContentNode['Vastaanottaja'],
        fromAddress: virtualContentNode['Lähettäjä'],
        bodyTemplate: virtualContentNode['Sisältötemplaatti'],
    };
}

function makeVirtualContentNode(fields) {
    return fields.reduce((obj, f) => {
        obj[f.name] = f.value;
        return obj;
    }, {});
}

export default RadFormsContentForm;
