import type { IExtension } from '../../../../../base/collection'
import type { TAria, TAriaAttributes } from '../../../../../../common'
import type { IPopover } from '../../../../popover'
import type { IListBox, TListBoxCollection } from '../../../../list-box'
import type { ICalendarItem } from '../../../item/types'

/** Уровень панели выбора: месяцы одного года или годы одной страницы. */
export type TCalendarPickerLevel = 'months' | 'years'

/**
 * Наборы места панели — то, что пишут в панель снаружи расширения: `id`
 * шапки (плагин связок). По нему панель и её список называются шапкой.
 */
export type TCalendarPickerSets = {
	/** Шапка панели: год или отрезок лет */
	heading: TAria
}

/**
 * Панель выбора месяца и года у сетки — выход для разметки, по одной на
 * место сетки.
 *
 * Экземпляры (`popover`, `list`, `engine`) у места свои и живут, пока жив
 * движок календаря: разметка отдаёт их компонентам пропами `ctrl` и
 * `engine`. Остальное — снимок того, что панель показывает сейчас.
 */
export type TCalendarPicker = {
	/** Поповер панели; его триггер — заголовок сетки */
	popover: IPopover
	/** Список месяцев или лет */
	list: IListBox
	/** Движок списка — разметка отдаёт его списку вместе с `list` */
	engine: TListBoxCollection
	/** Что в списке: месяцы года или годы страницы */
	level: TCalendarPickerLevel
	/** Текст шапки: год на месяцах, отрезок страницы на годах */
	heading: string
	/** Набор шапки: её `id` */
	headingAria: TAriaAttributes
	/**
	 * `id` шапки — им называются панель и список (`aria_labelledBy`).
	 * Плагин связок его не записал — `undefined`
	 */
	labelledBy: string | undefined
	/** Набор стрелки «назад»: имя по уровню — год или страница лет */
	prevAria: TAriaAttributes
	/** Набор стрелки «вперёд» */
	nextAria: TAriaAttributes
	/** Листать назад некуда: дальше только годы раньше `min` или `0001` */
	prevDisabled: boolean
	/** Листать вперёд некуда: дальше только годы позже `max` или `9999` */
	nextDisabled: boolean
}

export type TCalendarPickerEvents = {
	/**
	 * Панели надо перечитать: сменились уровень, год или страница, состав
	 * мест (месяцы сеток), подписи, границы или `id` шапки. Без аргумента —
	 * выход собирается из владельца, вида и мест
	 */
	'change:pickers': () => void
}

/**
 * Контракт расширения панелей выбора месяца и года.
 *
 * Панель — на месте сетки, а не на месяце: листание меняет месяц сетки, а
 * заголовок, его поповер и список остаются.
 */
export interface ICalendarPickerExtension extends IExtension<ICalendarItem, TCalendarPickerEvents> {
	/** Панели мест — по одной на сетку, в порядке сеток */
	readonly pickers: TCalendarPicker[]
	/** Наборы места `index`: пишет в них плагин связок */
	pickerSets(index: number): TCalendarPickerSets
	/** Кнопка шапки: месяцы ⇄ годы */
	toggleLevel(index: number): void
	/** Стрелка «назад»: на месяцах — год назад, на годах — страница из 12 лет */
	showPrev(index: number): void
	/** Стрелка «вперёд» */
	showNext(index: number): void
	/** Закрыть панель места — нажатие по её подложке. Места нет — ничего */
	close(index: number): void
}
