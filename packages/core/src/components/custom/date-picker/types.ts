import type {
	IInputControl,
	IInputControlProps,
	TInputControlEvents,
} from '../../base/input-control'
import type {
	TAria,
	TAriaAttributes,
	TCalendarDate,
	TDatasetAttributes,
	TWeekday,
} from '../../../common'
import type {
	ICalendar,
	TCalendarCollection,
	TCalendarRange,
	TCalendarUnavailable,
} from '../calendar'
import type { IDateInput } from '../date-input'

/**
 * Режим выбора: одна дата или диапазон «от и до». Несколько разных дат
 * DatePicker не выбирает — поле их не покажет.
 */
export type TDatePickerMode = 'single' | 'range'

/**
 * Значение DatePicker. `single` — дата `YYYY-MM-DD` или `undefined`, `range` —
 * пара «начало, конец» или `undefined`, пока не набраны оба конца.
 *
 * Значение хранится как задано: пару задом наперёд календарь показывает по
 * возрастанию, а поля — как есть.
 */
export type TDatePickerValue = TCalendarDate | TCalendarRange | undefined

/**
 * Сторона значения: календарь в панели или поля режима. Своё значение
 * DatePicker раскладывает по обеим, а правка одной стороны доходит до другой
 * через него.
 */
export type TDatePickerSide = 'calendar' | 'fields'

export type TDatePickerEvents = TInputControlEvents<TDatePickerValue> & {
	/** change:mode */
	'change:mode': (value: TDatePickerMode) => void
	/** change:open */
	'change:open': (value: boolean) => void
	/** open — панель открылась */
	open: () => void
	/** close — панель закрылась */
	close: () => void
	/** change:closeOnSelect */
	'change:closeOnSelect': (value: boolean) => void
	/** change:min */
	'change:min': (value: TCalendarDate | undefined) => void
	/** change:max */
	'change:max': (value: TCalendarDate | undefined) => void
	/** change:unavailable */
	'change:unavailable': (value: TCalendarUnavailable | undefined) => void
	/** change:weekStart */
	'change:weekStart': (value: TWeekday | undefined) => void
	/** change:locale */
	'change:locale': (value: string) => void
	/** change:timeZone */
	'change:timeZone': (value: string | undefined) => void
	/** change:triggerLabel */
	'change:triggerLabel': (value: string) => void
	/** change:startLabel */
	'change:startLabel': (value: string) => void
	/** change:endLabel */
	'change:endLabel': (value: string) => void
	/** change:startName */
	'change:startName': (value: string) => void
	/** change:endName */
	'change:endName': (value: string) => void
	/** change:triggerAria — набор кнопки календаря изменился */
	'change:triggerAria': (value: TAriaAttributes) => void
	/** change:panelAria — набор панели изменился */
	'change:panelAria': (value: TAriaAttributes) => void
}

export interface IDatePickerProps extends IInputControlProps<TDatePickerValue> {
	/** Режим: одна дата или диапазон. По умолчанию `single` */
	mode?: TDatePickerMode
	/** Открыта ли панель с календарём */
	open?: boolean
	/** Закрывать ли панель после выбора: в диапазоне — после второго дня */
	closeOnSelect?: boolean
	/** Первый день, который можно выбрать; раньше — ни фокуса, ни выбора в календаре, ошибка в поле */
	min?: TCalendarDate
	/** Последний день, который можно выбрать */
	max?: TCalendarDate
	/**
	 * Недоступные дни: в календаре фокус на них встаёт, выбор — нет, в поле —
	 * ошибка. Конец диапазона проверяется с якорем — набранным началом
	 */
	unavailable?: TCalendarUnavailable
	/** Первый день недели; не задан — по локали */
	weekStart?: TWeekday
	/** Локаль поля и календаря (BCP 47) */
	locale?: string
	/** Часовой пояс «сегодня» (IANA); не задан — пояс среды */
	timeZone?: string
	/** Имя кнопки календаря и панели для скринридера */
	triggerLabel?: string
	/** Имя поля начала диапазона */
	startLabel?: string
	/** Имя поля конца диапазона */
	endLabel?: string
	/**
	 * Имя начала диапазона при отправке формы. `name` — у поля одной даты: у
	 * диапазона значений два, и уходят они под своими именами
	 */
	startName?: string
	/** Имя конца диапазона при отправке формы */
	endName?: string
}

export interface IDatePicker extends IInputControl<
	TDatePickerValue,
	IDatePickerProps,
	TDatePickerEvents
> {
	/** Режим: одна дата или диапазон */
	mode: TDatePickerMode
	/** Открыта ли панель с календарём */
	open: boolean
	/** Закрывать ли панель после выбора */
	closeOnSelect: boolean
	/** Первый день, который можно выбрать */
	min: TCalendarDate | undefined
	/** Последний день, который можно выбрать */
	max: TCalendarDate | undefined
	/** Недоступные дни — календарю и полям */
	unavailable: TCalendarUnavailable | undefined
	/** Первый день недели; `undefined` — по локали */
	weekStart: TWeekday | undefined
	/** Локаль поля и календаря */
	locale: string
	/** Часовой пояс «сегодня» */
	timeZone: string | undefined
	/** Имя кнопки календаря и панели */
	triggerLabel: string
	/** Имя поля начала диапазона */
	startLabel: string
	/** Имя поля конца диапазона */
	endLabel: string
	/** Имя начала диапазона при отправке формы */
	startName: string
	/** Имя конца диапазона при отправке формы */
	endName: string
	/** Можно ли сейчас открыть панель: не `disabled` и не `readonly` */
	readonly openable: boolean
	/** Поле одной даты — экземпляр `TDateInput`, которым владеет DatePicker */
	readonly field: IDateInput
	/** Поле начала диапазона */
	readonly start: IDateInput
	/** Поле конца диапазона */
	readonly end: IDateInput
	/** Календарь панели — экземпляр `TCalendar`, которым владеет DatePicker */
	readonly calendar: ICalendar
	/** Движок коллекции календаря: по нему DatePicker зовёт команды выбора и фокуса */
	readonly engine: TCalendarCollection
	/**
	 * Набор кнопки календаря: `aria-haspopup="dialog"`, `aria-expanded`, имя —
	 * DatePicker, `aria-controls` — плагин связок
	 */
	readonly triggerAria: TAria
	/** Вид кнопки календаря: `data-selected`, пока панель открыта */
	readonly triggerDataset: TDatasetAttributes
	/**
	 * Набор панели: `role="dialog"`, `aria-modal`, имя — DatePicker, `id` —
	 * плагин связок
	 */
	readonly panelAria: TAria
	/**
	 * Набор корня. У диапазона корень — группа полей: `role="group"` и `aria`
	 * DatePicker с именем; у одной даты группа — само поле, и набор пуст
	 */
	readonly rootAria: TAriaAttributes
	/** Переключить панель. Ничего не делает, если открывать нельзя */
	toggleOpen(): void
}
