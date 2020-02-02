import {dateUtils} from '@rad-commons';

class DateTimePicker extends preact.Component {
    /**
     * @param {{onSelect: (date: Date) => any; inputName?: string; displayFormatFn?: (date: Date, format?: string) => string; defaultDate?: Date; minDate?: Date; maxDate?: Date; showInput?: boolean; showTime?: boolean; autoClose?: boolean;}} props
     */
    constructor(props) {
        super(props);
        this.pikaday = null;
        this.field = null;
        this.container = null;
    }
    /**
     * @access public
     */
    open() {
        this.pikaday.show();
    }
    /**
     * @access protected
     */
    componentDidMount() {
        this.pikaday = new window.Pikaday(this.makeSettings());
    }
    /**
     * @access protected
     */
    componentWillReceiveProps(props) {
        this.updateBounds(props);
    }
    /**
     * @access protected
     */
    render() {
        return <div class="datepicker">
            <input type={ this.props.showInput !== false ? 'text' : 'hidden' }
                   name={ this.props.inputName || 'date' }
                   ref={ el => { this.field = el; } }
                   autocomplet="off"/>
            <div class="datepicker-container"
                 ref={ el => { this.container = el; } }></div>
        </div>;
    }
    /**
     * @access private
     */
    makeSettings() {
        const settings = {
            onSelect: date => this.props.onSelect(date),
            field: this.field,
            container: this.container,
            showWeekNumber: true,
            showTime: this.props.showTime === true,
            autoClose: this.props.autoClose !== false,
            firstDay: 1,
            i18n: {
                previousMonth: 'Edellinen kuukausi',
                nextMonth    : 'Seuraava kuukausi',
                months       : ['Tammikuu','Helmikuu','Maaliskuu','Huhtikuu','Toukokuu','Kesäkuu','Heinäkuu','Elokuu','Syyskuu','Lokakuu','Marraskuu','Joulukuu'],
                weekdays     : ['Sunnuntai','Maanantai','Tiistai','Keskiviikko','Torstai','Perjantai','Lauantai'],
                weekdaysShort: ['Su','Ma','Ti','Ke','To','Pe','La']
            },
            toString: this.props.displayFormatFn
                ? this.props.displayFormatFn
                : date => dateUtils.getLocaleDateString(date, this.props.showTime === true)
        };
        if (settings.showTime) {
            settings.use24hour = true;
            settings.timeLabel = 'Aika';
        }
        if (this.props.defaultDate) {
            settings.defaultDate = this.props.defaultDate;
            settings.setDefaultDate = true;
        }
        if (this.props.minDate) {
            settings.minDate = this.props.minDate;
        }
        if (this.props.maxDate) {
            settings.maxDate = this.props.maxDate;
        }
        return settings;
    }
    /**
     * @access private
     */
    updateBounds(props) {
        if (props.minDate)
            this.pikaday.setMinDate(props.minDate);
        if (props.maxDate)
            this.pikaday.setMaxDate(props.maxDate);
    }
}

export default DateTimePicker;
