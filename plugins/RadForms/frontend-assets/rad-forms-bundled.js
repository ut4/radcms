/*!
 * rad-forms-bundled 0.0.0
 * https://github.com/ut4/radcms
 * @license GPLv3
 */
(function (_radCpanelCommons) {
    'use strict';

    const ValidatingFormImpl = _radCpanelCommons.contentFormRegister.getImpl('ValidatingForm');

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
            return preact.createElement(ValidatingFormImpl, {
                fields:  this.combinedVirtualFields ,
                values:  this.combinedVirtualFormValues ,
                getWidgetImpl:  getWidgetImpl ,
                settings:  {} ,
                fieldHints:  [] ,
                ref:  this.combinedVirtualFieldsForm ,});
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
            {id: 2, name: 'Aihe', value: data.subjectTemplate,
             validationRules: [['required']],
             widget: {name: 'textField', args: {}}},
            {id: 3, name: 'Vastaanottaja', value: data.toAddress,
             validationRules: [['required']],
             widget: {name: 'textField', args: {}}},
            {id: 4, name: 'Lähettäjä', value: data.fromAddress,
             validationRules: [['required']],
             widget: {name: 'textField', args: {}}},
            {id: 5, name: 'Templaatti', value: data.bodyTemplate,
             validationRules: [['required']],
             widget: {name: 'textArea', args: {}}},
        ];
    }

    function virtualContentNodeToBehaviourData(virtualContentNode) {
        return {
            subjectTemplate: virtualContentNode['Aihe'],
            toAddress: virtualContentNode['Vastaanottaja'],
            fromAddress: virtualContentNode['Lähettäjä'],
            bodyTemplate: virtualContentNode['Templaatti'],
        };
    }

    function makeVirtualContentNode(fields) {
        return fields.reduce((obj, f) => {
            obj[f.name] = f.value;
            return obj;
        }, {});
    }

    _radCpanelCommons.contentFormRegister.registerImpl('RadFormsForm', RadFormsContentForm);

}(radCpanelCommons));
