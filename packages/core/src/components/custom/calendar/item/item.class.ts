import { TControl } from '../../../base/control'
import type { IComponentOptions, TDefaultValues } from '../../../base/component'
import { FIRST_DATE, TStateUnit } from '../../../../common'
import type { TCalendarDate, TEventSink, TValuePayload } from '../../../../common'
import type {
	ICalendarItem,
	ICalendarItemProps,
	TCalendarItemEvents,
	TCalendarItemStates,
} from './types'

/**
 * День календаря — элемент коллекции (`Calendar.Item`).
 *
 * Своё у дня — дата, её номер в цифрах локали и «недоступен». Всё, что
 * день знает благодаря календарю, — выбран ли он, в диапазоне ли, стоит ли на
 * нём фокус, сегодня ли он, в границах ли — пишут ему расширения коллекции в
 * его наборы (`aria`, `dataset`) и в резольверы его состояний.
 *
 * `disabled` — день вне `min`/`max` или выключенный календарь: ни фокуса, ни
 * выбора. `unavailable` — фокус встаёт, выбора нет. Оба итога дают резольверы,
 * которые ставят расширения, как `bindDisabledToOwner` у других коллекций;
 * своё значение лежит в `rawValue`.
 *
 * Ячейку сетки по APG (Date Picker Dialog) фокусирует сама ячейка, поэтому
 * корень — `td`, и `aria` стоит на нём.
 */
export default class TCalendarItem<
	TProps extends ICalendarItemProps = ICalendarItemProps,
	TEvents extends TCalendarItemEvents = TCalendarItemEvents,
>
	extends TControl<TProps, TEvents, TCalendarItemStates>
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

	constructor(props: Partial<TProps> = {}, options: IComponentOptions<TCalendarItemStates> = {}) {
		super(props, options)

		const ctor = new.target as typeof TCalendarItem
		const own = props as Partial<ICalendarItemProps>

		this._date = own.date ?? ctor.defaultValues.date
		this._text = own.text ?? ctor.defaultValues.text

		this._states.unavailable =
			options.states?.unavailable ??
			new TStateUnit<boolean>({ initial: own.unavailable ?? ctor.defaultValues.unavailable })

		this._states.unavailable.events.on('change', (payload: TValuePayload<boolean>) => {
			this._sink.emit('change:unavailable', payload.newValue)
		})

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
		return this._states.unavailable.value
	}

	set unavailable(value: boolean) {
		this._states.unavailable.value = value
	}

	/**
	 * `aria-disabled` у дня — и выключенного, и недоступного: выбрать нельзя
	 * ни тот, ни другой. Различаются они фокусом, а его ведёт `tabindex`,
	 * который пишет расширение фокуса.
	 *
	 * Правило «нативный атрибут вместо ARIA-дубля» остаётся за базой: у `td`
	 * своего `disabled` нет, и база пишет `aria-disabled` сама. Здесь к нему
	 * добавляется недоступность. Хук зовут и конструктор базы, когда своего
	 * состояния у дня ещё нет, — тогда день не недоступен.
	 */
	protected override _syncDisabled(): void {
		super._syncDisabled()

		if (this._states.unavailable?.value) this._aria.add('aria-disabled', 'true')
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
			unavailable: this._states.unavailable.rawValue,
		} as TProps
	}
}
