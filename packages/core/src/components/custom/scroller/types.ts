import type { IControl, IControlProps, TControlEvents } from '../../base/control'
import type { TAriaAttributes } from '../../../common'

/**
 * Куда листать ленту: `prev` — к началу строки, `next` — к её концу.
 *
 * Направление логическое, а не «влево/вправо»: физическую сторону знает
 * только DOM (вычисленный `direction`), и считает её плагин.
 */
export type TScrollerDirection = 'prev' | 'next'

/** Что плагин намерил у вьюпорта: края ленты и остановки Tab внутри. */
export type TScrollerViewport = {
	/** Есть ли куда листать к началу строки */
	canPrev: boolean
	/** Есть ли куда листать к её концу */
	canNext: boolean
	/** Есть ли внутри ленты свои фокусируемые элементы */
	hasTabStops: boolean
}

export type TScrollerEvents = TControlEvents & {
	/** change:prevLabel */
	'change:prevLabel': (value: string) => void
	/** change:nextLabel */
	'change:nextLabel': (value: string) => void
	/** change:viewportAria */
	'change:viewportAria': (value: TAriaAttributes | undefined) => void
	/** change:canPrev */
	'change:canPrev': (value: boolean) => void
	/** change:canNext */
	'change:canNext': (value: boolean) => void
	/** change:hasTabStops */
	'change:hasTabStops': (value: boolean) => void
	/**
	 * Листнуть ленту в эту сторону.
	 *
	 * Запрос, а не факт: прокрутка — операция над DOM, её делает плагин.
	 * Наружу событие не публикуется — оно связывает ядро с плагином, а
	 * `@scroll` в разметке столкнулся бы с нативным событием прокрутки.
	 */
	'scroll:request': (direction: TScrollerDirection) => void
}

export interface IScrollerProps extends IControlProps {
	/** Имя кнопки «назад» для скринридера */
	prevLabel?: string
	/** Имя кнопки «вперёд» для скринридера */
	nextLabel?: string
	/**
	 * Атрибуты вьюпорта от потребителя: роль ряда и всё, что к ней прилагается.
	 *
	 * Своего экземпляра у вьюпорта нет, поэтому его атрибуты приходят
	 * значением — как `list_aria` у списка Select (AGENTS.md, «Часть или
	 * слот»). Лента их не разбирает и наружу отдаёт как есть.
	 */
	viewportAria?: TAriaAttributes
}

export interface IScroller extends IControl<IScrollerProps, TScrollerEvents> {
	/** Имя кнопки «назад» для скринридера */
	prevLabel: string
	/** Имя кнопки «вперёд» для скринридера */
	nextLabel: string
	/** Атрибуты вьюпорта от потребителя */
	viewportAria: TAriaAttributes | undefined
	/** Есть ли куда листать к началу строки */
	readonly canPrev: boolean
	/** Есть ли куда листать к концу строки */
	readonly canNext: boolean
	/** Есть ли внутри ленты свои остановки Tab */
	readonly hasTabStops: boolean
	/** Имя кнопки «назад»: `prevLabel`. Своего экземпляра у кнопки нет */
	readonly prevAria: TAriaAttributes
	/** Имя кнопки «вперёд»: `nextLabel` */
	readonly nextAria: TAriaAttributes
	/** Выключена ли кнопка «назад»: выключена лента или упёрлись в начало */
	readonly prevDisabled: boolean
	/** Выключена ли кнопка «вперёд»: выключена лента или упёрлись в конец */
	readonly nextDisabled: boolean
	/** `tabindex` вьюпорта: `0`, когда листать есть куда, а своих остановок нет */
	readonly viewportTabIndex: number | undefined
	/** Принять замер вьюпорта от плагина */
	notifyViewport(viewport: TScrollerViewport): void
	/** Листнуть к началу строки; на краю и у выключенной ленты молчит */
	scrollPrev(): void
	/** Листнуть к концу строки; на краю и у выключенной ленты молчит */
	scrollNext(): void
}
