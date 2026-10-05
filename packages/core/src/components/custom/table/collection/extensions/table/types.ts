import type { IExtension } from '../../../../../base/collection'
import type { ITableRow } from '../../../row/types'
import type { ITable } from '../../../types'

/**
 * Сколько показанных строк выбрано: `all` — все, `some` — часть, `none` — ни
 * одной. Это состояние чекбокса шапки: выбраны все — отмечен, часть —
 * отмечен частично.
 *
 * Считаются строки, которые пользователь может выбрать: показанные и не
 * выключенные. Выключенную строку не отметить, и с ней в счёте чекбокс шапки
 * не дошёл бы до «все» никогда.
 */
export type TTableShownSelection = 'all' | 'some' | 'none'

export type TTableExtensionEvents = {
	/** Сменилось, сколько показанных строк выбрано. Одно событие на действие */
	'change:shownSelection': (value: TTableShownSelection) => void
}

/** Контракт расширения таблицы над коллекцией строк. */
export interface ITableExtension<TRow extends ITableRow = ITableRow> extends IExtension<
	TRow,
	TTableExtensionEvents
> {
	/** Сколько показанных строк выбрано — из тех, что можно выбрать */
	readonly shownSelection: TTableShownSelection
	/**
	 * Выбрать все показанные строки, которые можно выбрать. Только в режиме
	 * `multiple`: в `single` выбор строки снимает выбор с другой
	 */
	selectShown(): void
	/** Снять выбор с показанных строк, которые можно выбрать */
	deselectShown(): void
}

/** Опции движка таблицы: таблица приходит и уходит после сборки. */
export type TTableEngineOptions<TOwner extends ITable = ITable> = {
	owner: TOwner
}
