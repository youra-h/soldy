import type { IControl, IControlProps, TControlEvents, TControlStates } from '../../base/control'
import type { TCollectionStorageDriverEvents } from '../../base/collection'
import type { TButtonView } from '../button/types'
import type { IAccordionCollectionProps } from './collection/types'
import type { IAccordionItem, IAccordionItemProps } from './item/types'

/**
 * Вид секций — значение `TButtonView` целиком: заголовок каждой секции рисует
 * `Button`, и вид Accordion это ровно вид, который он берёт. Своего реестра
 * нет: пробрасывая значение в строку, его нельзя было бы типизировать.
 */
export type TAccordionView = TButtonView

export type TAccordionEvents = TControlEvents &
	TCollectionStorageDriverEvents<IAccordionItem> & {
		/** change:view */
		'change:view': (value: TAccordionView | undefined) => void
	}

/** Пропсы самого компонента Accordion (без коллекционной части). */
export interface IAccordionComponentProps extends IControlProps {
	/** Внешний вид секций. Не задан — заголовки выглядят видом темы по умолчанию */
	view?: TAccordionView
}

/** Полный набор пропсов Accordion: компонент + коллекция (engine, items, trackBy, mode). */
export interface IAccordionProps
	extends
		IAccordionComponentProps,
		IAccordionCollectionProps<IAccordionItemProps, IAccordionItem> {}

export type TAccordionStates = TControlStates

export interface IAccordion extends IControl<IAccordionProps, TAccordionEvents> {
	/** Внешний вид секций */
	view: TAccordionView | undefined
}
