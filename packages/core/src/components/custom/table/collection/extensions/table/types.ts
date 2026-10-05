import type {
	IExtension,
	IExtensionItems,
	IItemExtension,
	TBaseItemEventsExtension,
} from '../../../../../base/collection'
import type { ICheckBox } from '../../../../check-box/types'
import type { ITableRow } from '../../../row/types'
import type { ITable } from '../../../types'

/**
 * Сколько показанных строк выбрано: `all` — все, `some` — часть, `none` — ни
 * одной, `empty` — выбирать нечего. Это состояние чекбокса шапки: выбраны
 * все — отмечен, часть — отмечен частично, выбирать нечего — выключен.
 *
 * Считаются строки, которые пользователь может выбрать: показанные и не
 * выключенные. Выключенную строку не отметить, и с ней в счёте чекбокс шапки
 * не дошёл бы до «все» никогда. Таких строк нет — показанных нет, все
 * выключены или выключена таблица — `empty`.
 */
export type TTableShownSelection = 'all' | 'some' | 'none' | 'empty'

export type TTableExtensionEvents = {
	/** Сменилось, сколько показанных строк выбрано. Одно событие на действие */
	'change:shownSelection': (value: TTableShownSelection) => void
	/** Выбор строк включили или выключили: режим выбора стал `none` или перестал им быть */
	'change:selecting': (value: boolean) => void
}

export type TTableItemEvents = TBaseItemEventsExtension & {
	/** Выбор строк включили или выключили — перечитай `selecting` */
	'change:selecting': () => void
}

/**
 * Item-адаптер таблицы — что строка знает о выборе строк таблицы.
 *
 * `TEvents` параметризован, чтобы наследник мог добавить своё событие (см.
 * `IItemExtension`).
 */
export interface ITableItemExtension<
	TRow extends ITableRow = ITableRow,
	TEvents extends TTableItemEvents = TTableItemEvents,
> extends IItemExtension<TRow, TEvents> {
	/** Выбор строк включён: у строки есть ячейка выбора */
	readonly selecting: boolean
	/** Чекбокс выбора строки — его держит таблица, см. `ITableExtension.checkBoxOf` */
	readonly checkBox: ICheckBox
}

/** Контракт расширения таблицы над коллекцией строк. */
export interface ITableExtension<
	TRow extends ITableRow = ITableRow,
	// `any` в констрейнте намеренно: карта событий инвариантна, и требовать
	// здесь точный набор значило бы запретить наследнику её расширить
	TItemExt extends ITableItemExtension<TRow, any> = ITableItemExtension<TRow>,
>
	extends IExtension<TRow, TTableExtensionEvents>, IExtensionItems<TRow, TItemExt> {
	/** Сколько показанных строк выбрано — из тех, что можно выбрать */
	readonly shownSelection: TTableShownSelection
	/**
	 * Выбор строк включён — режим выбора не `none`. Один факт решает и выбор,
	 * и колонку выбора: пока режим `none`, колонки нет
	 */
	readonly selecting: boolean
	/**
	 * Чекбокс «выбрать все показанные» — в шапке колонки выбора. Отметку,
	 * «часть» и выключенность пишет таблица из `shownSelection`, а запись
	 * отметки в него — просьба выбрать или снять показанные строки
	 */
	readonly selectAll: ICheckBox
	/**
	 * Выбрать все показанные строки, которые можно выбрать. Только в режиме
	 * `multiple`: в `single` выбор строки снимает выбор с другой
	 */
	selectShown(): void
	/** Снять выбор с показанных строк, которые можно выбрать */
	deselectShown(): void
	/**
	 * Чекбокс выбора строки. Отметку, выключенность, размер и вариант пишет
	 * таблица — от выбора и строки, а запись отметки в него — просьба выбрать
	 * строку или снять с неё выбор. Один на строку, пока она в коллекции
	 */
	checkBoxOf(row: TRow): ICheckBox
}

/** Опции движка таблицы: таблица приходит и уходит после сборки. */
export type TTableEngineOptions<TOwner extends ITable = ITable> = {
	owner: TOwner
}
