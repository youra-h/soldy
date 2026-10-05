import { TControl } from '../../base/control'
import type { TDefaultValues } from '../../base/component'
import { DEFAULT_LOCALE } from '../../../common'
import type { ITable, ITableProps, TTableEvents } from './types'

/**
 * Таблица — владелец коллекции строк, как ListBox — владелец опций. Корень —
 * `table`.
 *
 * Строки, колонки, ячейки, выбор и сортировка строк — коллекция и её
 * расширения (`collection/`): строки — элементы над записями приложения,
 * колонки — своя коллекция в расширении `columns`, ячейки — проекция строки на
 * показанные колонки, порядок строк — выборка расширения `sort`. `disabled`,
 * `size` и `variant` — от контрола, строкам их раздаёт расширение `table`.
 *
 * Своё у таблицы — язык (`locale`): по нему сортировка сравнивает строки.
 * Хранится как задан; невалидный тег сортировка читает как `en-US`, а не
 * падает. И имя чекбокса «выбрать все» (`selectAllLabel`): своего текста у
 * ячейки шапки колонки выбора нет, а языка интерфейса библиотека не знает —
 * умолчание английское, как у `closeLabel`.
 */
export class TTable extends TControl<ITableProps, TTableEvents> implements ITable {
	static override baseClass = 's-table'

	static defaultValues: typeof TControl.defaultValues &
		TDefaultValues<ITableProps, 'locale' | 'selectAllLabel'> = {
		...TControl.defaultValues,
		tag: 'table',
		locale: DEFAULT_LOCALE,
		selectAllLabel: 'Select all',
	}

	protected _locale: string
	protected _selectAllLabel: string

	constructor(props: Partial<ITableProps> = {}) {
		super(props)

		const ctor = new.target as typeof TTable

		this._locale = props.locale ?? ctor.defaultValues.locale
		this._selectAllLabel = props.selectAllLabel ?? ctor.defaultValues.selectAllLabel
	}

	get locale(): string {
		return this._locale
	}

	set locale(value: string) {
		if (this._locale === value) return

		this._locale = value
		this.events.emit('change:locale', value)
	}

	get selectAllLabel(): string {
		return this._selectAllLabel
	}

	set selectAllLabel(value: string) {
		if (this._selectAllLabel === value) return

		this._selectAllLabel = value
		this.events.emit('change:selectAllLabel', value)
	}

	override getProps(): ITableProps {
		return {
			...super.getProps(),
			locale: this._locale,
			selectAllLabel: this._selectAllLabel,
		}
	}
}
