import {InputGroup} from '@rad-commons';
import BaseFieldWidget from './Base.jsx';
import DateTimePicker from '../../Common/DateTimePicker.jsx';

/**
 * Widgetti, jolla voi valita päivämäärän tai päivämäärän sekä ajan.
 */
class DateTimePickerFieldWidget extends BaseFieldWidget {
    /**
     * @returns {string}
     * @access protected
     */
    getInitialValue() {
        return '';
    }
    /**
     * @access protected
     */
    render() {
        return <InputGroup>
            <label htmlFor={ this.props.field.name }>{ this.label }</label>
            <DateTimePicker
                inputName={ this.props.field.name }
                defaultDate={ this.fixedInitialValue ? new Date(this.fixedInitialValue * 1000) : null }
                onSelect={ date => {
                    const unixTime = Math.floor(date.getTime() / 1000);
                    this.props.onValueChange(!this.props.field.datatype || this.props.field.datatype.endsWith('int')
                        ? unixTime
                        : unixTime.toString());
                } }
                showTime={ this.props.settings.showTime }/>
        </InputGroup>;
    }
}

export default DateTimePickerFieldWidget;
