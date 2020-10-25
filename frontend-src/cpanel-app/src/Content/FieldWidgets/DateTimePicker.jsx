import BaseFieldWidget from './Base.jsx';
import DateTimePicker from '../../Common/DateTimePicker.jsx';

/**
 * Widgetti, jolla voi valita päivämäärän tai päivämäärän sekä ajan.
 */
class DateTimePickerFieldWidget extends BaseFieldWidget {
    /**
     * @inheritdoc
     */
    static getInitialValue() {
        return Math.floor(Date.now() / 1000);
    }
    /**
     * @inheritdoc
     */
    static convert(previous, _newWidget, value) {
        return previous.group !== 'date'
            ? DateTimePickerFieldWidget.getInitialValue()
            : value;
    }
    /**
     * @access protected
     */
    render({field, initialValue, settings, onValueChange}) {
        return <DateTimePicker
            inputName={ field.name }
            defaultDate={ new Date(initialValue * 1000) }
            onSelect={ date => {
                const unixTime = Math.floor(date.getTime() / 1000);
                onValueChange(!field.dataType || field.dataType.type.endsWith('int')
                    ? unixTime
                    : unixTime.toString());
            } }
            showTime={ settings.showTime }/>;
    }
}

export default DateTimePickerFieldWidget;
