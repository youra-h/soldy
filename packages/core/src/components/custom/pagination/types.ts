import type {
	IValueControl,
	IValueControlProps,
	TValueControlEvents,
} from '../../base/value-control'
import type { TAria, TAriaAttributes } from '../../../common'
import type { IPaginationCollectionProps } from './collection/types'

/**
 * Ключ страницы. У числовой пагинации — номер страницы, с единицы. У
 * текстовой — `value` страницы из `pages`, а без него — её номер по месту в
 * списке.
 *
 * Значение пагинации — ключ текущей страницы. Ключ без страницы остаётся
 * значением: страниц могло не стать на время (данные грузятся, `total` — 0),
 * и вернувшаяся страница снова станет текущей.
 */
export type TPaginationValue = string | number

/**
 * Страница текстовой пагинации: «Админ», «Записи», «Конференция».
 *
 * Порядок страниц — порядок списка: от него считаются окно, первая и
 * последняя страницы и стрелки. Сортирует список приложение.
 */
export type TPaginationPage = {
	/** Текст страницы — содержимое её кнопки и её имя */
	readonly text: string
	/**
	 * Ключ страницы — значение пагинации, когда страница текущая. Не задан —
	 * номер страницы по месту в списке, с единицы. Ключи страниц не повторяются
	 */
	readonly value?: string | number
}

export type TPaginationEvents = TValueControlEvents<TPaginationValue> & {
	/** change:total */
	'change:total': (value: number) => void
	/** change:pageSize */
	'change:pageSize': (value: number) => void
	/** change:pages */
	'change:pages': (value: TPaginationPage[] | undefined) => void
	/** change:middleCount */
	'change:middleCount': (value: number) => void
	/** change:locale */
	'change:locale': (value: string) => void
	/** change:prevAria — набор атрибутов стрелки «назад» изменился */
	'change:prevAria': (value: TAriaAttributes) => void
	/** change:nextAria — набор атрибутов стрелки «вперёд» изменился */
	'change:nextAria': (value: TAriaAttributes) => void
}

/** Пропсы самой пагинации (без коллекционной части). */
export interface IPaginationComponentProps extends IValueControlProps<TPaginationValue> {
	/**
	 * Сколько всего элементов листают — число страниц по нему и `pageSize`.
	 * Без `pages` пагинация числовая
	 */
	total?: number
	/** Сколько элементов на странице */
	pageSize?: number
	/**
	 * Страницы текстовой пагинации — по порядку списка. Заданы — `total` и
	 * `pageSize` не читаются, и страниц столько, сколько в списке
	 */
	pages?: TPaginationPage[]
	/**
	 * Сколько страниц стоит между первой и последней — вокруг текущей. Хранится
	 * как задано, а окно прижимает его к числу страниц: от 0 до «страниц − 2»
	 */
	middleCount?: number
	/**
	 * Локаль номеров страниц (BCP 47): номер — в цифрах локали («12 345»). В
	 * разметке её нет: язык задаёт приложение на всю библиотеку, и пишет его
	 * плагин языка
	 */
	locale?: string
}

/** Полный набор пропсов пагинации: свои и коллекционные (`engine`). */
export interface IPaginationProps extends IPaginationComponentProps, IPaginationCollectionProps {}

export interface IPagination extends IValueControl<
	TPaginationValue,
	IPaginationProps,
	TPaginationEvents
> {
	/** Сколько всего элементов листают */
	total: number
	/** Сколько элементов на странице */
	pageSize: number
	/** Страницы текстовой пагинации; `undefined` — пагинация числовая */
	pages: TPaginationPage[] | undefined
	/** Сколько страниц стоит между первой и последней — как задано */
	middleCount: number
	/** Локаль номеров страниц */
	locale: string
	/**
	 * Назад нельзя: пагинация выключена, текущей страницы нет или она первая
	 */
	readonly prevDisabled: boolean
	/**
	 * Вперёд нельзя: пагинация выключена, текущей страницы нет или она
	 * последняя
	 */
	readonly nextDisabled: boolean
	/**
	 * Атрибуты стрелки «назад»: имя от локали пишет плагин имён. Своего
	 * экземпляра у стрелки нет
	 */
	readonly prevAria: TAria
	/** Атрибуты стрелки «вперёд» */
	readonly nextAria: TAria
	/** На предыдущую страницу; назад нельзя — ничего не делает */
	prev(): void
	/** На следующую страницу; вперёд нельзя — ничего не делает */
	next(): void
}
