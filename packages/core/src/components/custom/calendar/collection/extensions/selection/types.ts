import type {
	IExtension,
	IExtensionItems,
	IItemExtension,
	TBaseItemEventsExtension,
} from '../../../../../base/collection'
import type { TCalendarDate } from '../../../../../../common'
import type { ICalendarItem } from '../../../item/types'
import type { TCalendarValue } from '../../../types'

/**
 * Режим выбора: одна дата, несколько разных дат или диапазон «от и до».
 * Режим — свойство коллекции, как `mode` у ListBox: сетка, фокус и листание у
 * всех трёх одни, различаются значение и выбор.
 */
export type TCalendarMode = 'single' | 'multiple' | 'range'

/** Owner-level props коллекции от расширения выбора. */
export interface ICalendarSelectionCollectionProps {
	/** Режим выбора */
	mode?: TCalendarMode
}

export type TCalendarSelectionEvents = {
	/** change:mode */
	'change:mode': (value: TCalendarMode) => void
	/** Диапазон начат (дата — якорь) или закончен и отменён (`undefined`) */
	'change:anchor': (value: TCalendarDate | undefined) => void
	/** Указатель перешёл на другой день или ушёл с сетки (`undefined`) */
	'change:hovered': (value: TCalendarDate | undefined) => void
	/** Сменились отметки дней: выбор, диапазон или предпросмотр */
	'change:marks': () => void
}

/**
 * Контракт расширения выбора календаря.
 *
 * Выбор — **даты, а не элементы**: выбранная дата живёт и там, где её дня
 * нет в коллекции (другой месяц, другой год). Поэтому стандартный
 * `TSelectionExtension`, который хранит экземпляры элементов, календарю не
 * годится, и выбор у него свой.
 */
export interface ICalendarSelectionExtension<
	// `any` в констрейнте: карта событий item-адаптера инвариантна
	TItemExt extends ICalendarSelectionItemExtension<any> = ICalendarSelectionItemExtension,
>
	extends
		IExtension<ICalendarItem, TCalendarSelectionEvents>,
		IExtensionItems<ICalendarItem, TItemExt> {
	/** Режим выбора */
	mode: TCalendarMode
	/** Выбирают ли в сетке несколько дней — `aria-multiselectable` */
	readonly multiselectable: boolean
	/** Значение календаря в форме режима */
	readonly value: TCalendarValue
	/** Якорь начатого диапазона — первый выбранный конец */
	readonly anchor: TCalendarDate | undefined
	/** День под указателем */
	readonly hovered: TCalendarDate | undefined
	/** Выбран ли день — в значении или, пока стоит якорь, в предпросмотре */
	isSelected(date: TCalendarDate): boolean
	/**
	 * Выбор пользователя. `single` — заменить значение, `multiple` —
	 * переключить дату, `range` — первый выбор ставит якорь, второй пишет
	 * диапазон. Фокус встаёт на дату. `false` — день нельзя выбрать
	 */
	chooseDate(date: TCalendarDate): boolean
	/** Отменить начатый диапазон: снять якорь */
	cancelRange(): void
	/** День под указателем — для предпросмотра диапазона; ушёл с сетки — `undefined` */
	notifyHover(date: TCalendarDate | undefined): void
}

export type TCalendarSelectionItemEvents = TBaseItemEventsExtension & {
	/** Выбран ли день — перечитать `selected` */
	'change:selected': () => void
}

/** Item-адаптер выбора: выбран ли день и выбор пользователя. */
export interface ICalendarSelectionItemExtension<
	TEvents extends TCalendarSelectionItemEvents = TCalendarSelectionItemEvents,
> extends IItemExtension<ICalendarItem, TEvents> {
	/** Выбран ли день */
	readonly selected: boolean
	/** Выбор пользователя по этому дню */
	choose(): boolean
}
