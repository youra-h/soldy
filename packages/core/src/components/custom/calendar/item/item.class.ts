import { TControl } from '../../../base/control'
import type { IComponentOptions, TDefaultValues } from '../../../base/component'
import { FIRST_DATE, TChangeEvent } from '../../../../common'
import type { TCalendarDate, TEventSink } from '../../../../common'
import type { ICalendarItem, ICalendarItemProps, TCalendarItemEvents } from './types'

/**
 * День календаря — элемент коллекции (`Calendar.Item`).
 *
 * Своё у дня — дата, её номер в цифрах локали и «недоступен». Всё, что
 * день знает благодаря календарю, — выбран ли он, в диапазоне ли, стоит ли на
 * нём фокус, сегодня ли он, в границах ли — пишут ему расширения коллекции в
 * его наборы (`aria`, `dataset`) и в его свойства.
 *
 * `disabled` — день вне `min`/`max` или выключенный календарь: ни фокуса, ни
 * выбора. `unavailable` — фокус встаёт, выбора нет. Оба значения пишут
 * расширения календаря: вид — `disabled`, выбор — `unavailable` по правилу.
 *
 * Ячейку сетки по APG (Date Picker Dialog) фокусирует сама ячейка, поэтому
 * корень — `td`, и `aria` стоит на нём.
 */
export default class TCalendarItem<
	TProps extends ICalendarItemProps = ICalendarItemProps,
	TEvents extends TCalendarItemEvents = TCalendarItemEvents,
>
	extends TControl<TProps, TEvents>
	implements ICalendarItem<TProps, TEvents>
{
	static override baseClass = 's-calendar-item'

	static defaultValues: typeof TControl.defaultValues &
		TDefaultValues<ICalendarItemProps, 'date' | 'text' | 'unavailable'> = {
		...TControl.defaultValues,
		date: FIRST_DATE,
		text: '',
		unavailable: false,
		tag: 'td',
	}

	protected _date: TCalendarDate
	protected _text: string
	protected _unavailable: boolean

	constructor(props: Partial<TProps> = {}, options: IComponentOptions = {}) {
		super(props, options)

		const ctor = new.target as typeof TCalendarItem
		const own = props as Partial<ICalendarItemProps>

		this._date = own.date ?? ctor.defaultValues.date
		this._text = own.text ?? ctor.defaultValues.text

		this._unavailable = own.unavailable ?? ctor.defaultValues.unavailable

		this.events.on('change:unavailable', () => this._syncDisabled())
		this.events.on('change:unavailable', () => this._syncUnavailable())

		this._syncDisabled()
		this._syncUnavailable()
	}

	/**
	 * Эмит собственных событий класса — без приведения `this.events` к
	 * конкретной карте (см. `TEventSink` в `common/event/types.ts`).
	 */
	protected get _sink(): TEventSink<TCalendarItemEvents> {
		return this.events
	}

	get date(): TCalendarDate {
		return this._date
	}

	set date(value: TCalendarDate) {
		if (this._date === value) return

		this._date = value
		this._sink.emit('change:date', value)
	}

	get text(): string {
		return this._text
	}

	set text(value: string) {
		if (this._text === value) return

		this._text = value
		this._sink.emit('change:text', value)
	}

	get unavailable(): boolean {
		return this._unavailable
	}

	set unavailable(value: boolean) {
		if (value === this._unavailable) return

		const e = new TChangeEvent(value, this._unavailable)

		this._sink.emit('change:unavailable:before', e)

		if (e.defaultPrevented || e.value === this._unavailable) return

		this._unavailable = e.value
		this._sink.emit('change:unavailable', e.value)
	}

	/**
	 * `aria-disabled` у дня — и выключенного, и недоступного: выбрать нельзя
	 * ни тот, ни другой. Различаются они фокусом, а его ведёт `tabindex`,
	 * который пишет расширение фокуса.
	 *
	 * Правило «нативный атрибут вместо ARIA-дубля» остаётся за базой: у `td`
	 * своего `disabled` нет, и база пишет `aria-disabled` сама. Здесь к нему
	 * добавляется недоступность. Хук зовут и конструктор базы, когда полей дня
	 * ещё нет, — тогда день не недоступен.
	 */
	protected override _syncDisabled(): void {
		super._syncDisabled()

		if (this.unavailable) this._aria.add('aria-disabled', 'true')
	}

	/** `data-unavailable` — то же для темы, `"true"` и `"false"`. */
	protected _syncUnavailable(): void {
		this._dataset.add('unavailable', this.unavailable)
	}

	override getProps(): TProps {
		return {
			...super.getProps(),
			date: this._date,
			text: this._text,
			unavailable: this._unavailable,
		} as TProps
	}
}
