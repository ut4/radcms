import BaseFieldWidget from './Base.jsx';
import DateTimePicker from '../../Common/DateTimePicker.jsx';

/**
 * Widgetti, jolla voi valita päivämäärän tai päivämäärän sekä ajan.
 */
class DateTimePickerFieldWidget extends BaseFieldWidget {
    /**
     * @inheritdoc
     */
    static convert(previous, _newWidget, value) {
        return previous.group !== 'date' ? null : value;
    }
    /**
     * @inheritdoc
     */
    getInitialValue() {
        return '';
    }
    /**
     * @access protected
     */
    render({field, settings, onValueChange}) {
        return <DateTimePicker
            inputName={ field.name }
            defaultDate={ this.fixedInitialValue ? new Date(this.fixedInitialValue * 1000) : null }
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
