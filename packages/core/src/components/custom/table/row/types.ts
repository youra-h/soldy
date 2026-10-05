import type { IControl, IControlProps, TControlEvents } from '../../../base/control'
import type { TAria, TAriaAttributes } from '../../../../common'
import type { ITableCollectionItemProps } from '../collection/types'

/**
 * Запись приложения — то, что показывает строка.
 *
 * Любой объект: строка не знает ни её полей, ни её типа. Значение ячейки —
 * поле записи под ключом колонки (`field`), его достаёт проекция ячеек.
 * Запись не мутируется: сменилась запись — строке дают новую.
 */
export type TTableRecord = object

export type TTableRowEvents = TControlEvents & {
	/** Строке дали другую запись — её ячейки надо перечитать */
	'change:data': (value: TTableRecord | undefined) => void
	/** Набор атрибутов заголовка строки изменился */
	'change:headerAria': (value: TAriaAttributes) => void
}

export interface ITableRowProps extends IControlProps, ITableCollectionItemProps {
	/** Запись приложения, которую показывает строка */
	data?: TTableRecord
}

export interface ITableRow<
	TProps extends ITableRowProps = ITableRowProps,
	TEvents extends TTableRowEvents = TTableRowEvents,
> extends IControl<TProps, TEvents> {
	/** Запись приложения; не задана — ячейки строки пусты */
	data: TTableRecord | undefined
	/**
	 * ARIA заголовка строки — ячейки колонки `rowHeader`: `id`, на который
	 * ссылается имя чекбокса выбора строки, пишет плагин связок строки
	 */
	readonly headerAria: TAria
}
