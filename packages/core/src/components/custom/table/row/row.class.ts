import { TControl } from '../../../base/control'
import type { TDefaultValues } from '../../../base/component'
import type { TEventSink } from '../../../../common'
import type { ITableRow, ITableRowProps, TTableRecord, TTableRowEvents } from './types'

/**
 * Строка таблицы — элемент коллекции строк над записью приложения (`data`).
 *
 * Своё у строки — запись и то, что строке нужно для выбора: `disabled`
 * (выключенную строку пользователь не выбирает). База — контрол, как у дня
 * календаря. Корень — `tr`.
 *
 * О колонках и коллекции строка не знает. Ячейки — не её свойство: это
 * пересечение записи и показанных колонок, его отдаёт фасад строки. Выбрана
 * ли строка, знает коллекция — она же пишет ей `data-selected`.
 */
export default class TTableRow<
	TProps extends ITableRowProps = ITableRowProps,
	TEvents extends TTableRowEvents = TTableRowEvents,
>
	extends TControl<TProps, TEvents>
	implements ITableRow<TProps, TEvents>
{
	static override baseClass = 's-table-row'

	static defaultValues: typeof TControl.defaultValues &
		TDefaultValues<ITableRowProps, never, 'data'> = {
		...TControl.defaultValues,
		tag: 'tr',
		data: undefined,
	}

	protected _data: TTableRecord | undefined

	constructor(props: Partial<TProps> = {}) {
		super(props)

		const ctor = new.target as typeof TTableRow

		this._data = props.data ?? ctor.defaultValues.data
	}

	/**
	 * Эмит собственных событий класса — без приведения `this.events` к
	 * конкретной карте (см. `TEventSink` в `common/event/types.ts`).
	 */
	protected get _sink(): TEventSink<TTableRowEvents> {
		return this.events
	}

	get data(): TTableRecord | undefined {
		return this._data
	}

	/**
	 * Запись сверяется по ссылке: запись приложения строка не мутирует и не
	 * разбирает, а новая запись с тем же содержимым — это новый объект данных.
	 */
	set data(value: TTableRecord | undefined) {
		if (this._data === value) return

		this._data = value
		this._sink.emit('change:data', value)
	}

	override getProps(): TProps {
		return {
			...super.getProps(),
			data: this._data,
		} as TProps
	}
}
