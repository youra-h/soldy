import type { IDatePicker, TEventSink } from '@soldy-ui/core'
import { TFieldNamesPlugin } from '../../field/names'
import type { TTranslations } from '../../../locale/types'
import type { TDatePickerNamesPluginEvents } from './types'

/**
 * TDatePickerNamesPlugin — имена DatePicker от локали.
 *
 * Имя кнопки очистки — как у любого поля (`TFieldNamesPlugin`): DatePicker —
 * поле, и имя его кнопки собирается с его именем (`field.clear`). Имя кнопки
 * календаря — в её набор (`triggerAria`) и в набор панели (`panelAria`):
 * панель называется так же, как кнопка, которая её открывает. Имена полей
 * концов диапазона — выходами (`start`, `end`): поля — свои компоненты, и имя
 * им разметка отдаёт пропом `aria_label`, который пишет их собственный
 * `TAriaPlugin`.
 */
export class TDatePickerNamesPlugin extends TFieldNamesPlugin<
	IDatePicker,
	TDatePickerNamesPluginEvents
> {
	private _start = ''
	private _end = ''

	/** Имя поля начала диапазона. */
	get start(): string {
		return this._start
	}

	/** Имя поля конца диапазона. */
	get end(): string {
		return this._end
	}

	protected override get _sink(): TEventSink<TDatePickerNamesPluginEvents> {
		return this.events
	}

	protected override _name(owner: IDatePicker, translations: TTranslations): void {
		super._name(owner, translations)

		const { trigger, start, end } = translations.datePicker

		owner.triggerAria.add('aria-label', trigger)
		owner.panelAria.add('aria-label', trigger)

		if (this._start !== start) {
			this._start = start
			this._sink.emit('change:start', start)
		}

		if (this._end !== end) {
			this._end = end
			this._sink.emit('change:end', end)
		}
	}
}
