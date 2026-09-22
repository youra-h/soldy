import type { ISelect } from '@soldy-ui/core'
import type { TListEdge } from '../../../list/navigation'

/**
 * Срез клавиатурного плагина, который видят стратегии — не весь его API.
 *
 * Имена намеренно не совпадают с внутренними методами `TSelectKeyboardPlugin`
 * (`move`, `highlightEdge`, …): стратегии — публичный контракт плагина для
 * посторонних классов, а не доступ к его защищённым внутренностям.
 */
export interface ISelectKeyboardHost {
	readonly highlightedUid: string | number | null
	/** Сдвинуть подсветку на `step` с цикличным переходом через край. */
	navigate(step: number): void
	/** Поставить подсветку на край списка. */
	jumpTo(edge: TListEdge): void
	/** Подсветка на выбранную опцию — иначе на первую. */
	highlightSelected(): void
	/** Выбрать подсвеченную опцию. */
	chooseHighlighted(): void
	/** Накопить символ в буфере набора и подсветить совпадение. */
	typeaheadTo(char: string): void
	/** Escape нажат на уже закрытой панели — сигнал `TEditablePlugin`. */
	emitClosedEscape(): void
}

/** Клавиатурная модель для одного режима `editable`. */
export interface ISelectKeyboardStrategy {
	handleClosed(e: KeyboardEvent, owner: ISelect, host: ISelectKeyboardHost): void
	handleOpen(e: KeyboardEvent, owner: ISelect, host: ISelectKeyboardHost): void
}
