import { TControl } from '../../../base/control'
import type { TDefaultValues } from '../../../base/component'
import { TAria } from '../../../../common'
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
 *
 * **Заголовок строки** — ячейка колонки `rowHeader`, по её тексту строку
 * называют. Экземпляра у ячейки нет, поэтому её набор держит строка
 * (`headerAria`), как секция Accordion — набор своей панели: `id` в него пишет
 * плагин связок строки от монтирования, а на ячейку набор кладёт проекция
 * ячеек.
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

	protected _headerAria: TAria

	constructor(props: Partial<TProps> = {}) {
		super(props)

		const ctor = new.target as typeof TTableRow

		this._data = props.data ?? ctor.defaultValues.data

		this._headerAria = new TAria()

		this._headerAria.events.on('change', () =>
			this._sink.emit('change:headerAria', this._headerAria.toObject()),
		)
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

	/**
	 * ARIA заголовка строки — ячейки колонки `rowHeader`. Ячейка — разметка
	 * строки без экземпляра, поэтому набор держит строка (AGENTS.md, «Часть
	 * или слот»). `id` в него пишет `TTableRowIdsPlugin`, и на этот `id`
	 * ссылается имя чекбокса выбора строки. Об изменении набор сообщает
	 * `change:headerAria`.
	 */
	get headerAria(): TAria {
		return this._headerAria
	}

	override getProps(): TProps {
		return {
			...super.getProps(),
			data: this._data,
		} as TProps
	}
}
