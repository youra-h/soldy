import { TControl } from '../../base/control'
import type { TDefaultValues } from '../../base/component'
import { DEFAULT_LOCALE, DEFAULT_TRANSLATIONS } from '../../../common'
import type { TTranslations } from '../../../common'
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
 * падает. Задаёт его приложение одним языком на всё (плагин языка). И имя
 * чекбокса «выбрать все» (`selectAllLabel`): своего текста у ячейки шапки
 * колонки выбора нет, и строку даёт словарь (`translations`, раздел `table`).
 */
export class TTable extends TControl<ITableProps, TTableEvents> implements ITable {
	static override baseClass = 's-table'

	static defaultValues: typeof TControl.defaultValues & TDefaultValues<ITableProps, 'locale'> = {
		...TControl.defaultValues,
		tag: 'table',
		locale: DEFAULT_LOCALE,
	}

	protected _locale: string
	protected _translations: TTranslations = DEFAULT_TRANSLATIONS

	constructor(props: Partial<ITableProps> = {}) {
		super(props)

		const ctor = new.target as typeof TTable

		this._locale = props.locale ?? ctor.defaultValues.locale
	}

	get locale(): string {
		return this._locale
	}

	set locale(value: string) {
		if (this._locale === value) return

		this._locale = value
		this.events.emit('change:locale', value)
	}

	/**
	 * Словарь строк библиотеки: таблица читает из него имя чекбокса «выбрать
	 * все». Та же ссылка — ничего не меняет.
	 */
	get translations(): TTranslations {
		return this._translations
	}

	set translations(value: TTranslations) {
		if (this._translations === value) return

		this._translations = value
		this.events.emit('change:translations', value)
	}

	/**
	 * Имя чекбокса «выбрать все» — выход, а не вход: строку даёт словарь, а
	 * разметка отдаёт её чекбоксу шапки, у которого своего текста нет.
	 */
	get selectAllLabel(): string {
		return this._translations.table.selectAll
	}

	override getProps(): ITableProps {
		return {
			...super.getProps(),
			locale: this._locale,
		}
	}
}
