import type { IControl, IControlProps, TControlEvents, TControlStates } from '../../base/control'
import type { TCollectionStorageDriverEvents } from '../../base/collection'
import type { IAccordionCollectionProps } from './collection/types'
import type { IAccordionItem, IAccordionItemProps } from './item/types'

export type TAccordionView = 'plain' | 'outlined' | 'filled'

export type TAccordionEvents = TControlEvents &
	TCollectionStorageDriverEvents<IAccordionItem> & {
		/** change:view */
		'change:view': (value: TAccordionView) => void
	}

/** Пропсы самого компонента Accordion (без коллекционной части). */
export interface IAccordionComponentProps extends IControlProps {
	/** Внешний вид компонента */
	view?: TAccordionView
}

/** Полный набор пропсов Accordion: компонент + коллекция (engine, items, trackBy, mode). */
export interface IAccordionProps
	extends
		IAccordionComponentProps,
		IAccordionCollectionProps<IAccordionItemProps, IAccordionItem> {}

export type TAccordionStates = TControlStates

export interface IAccordion extends IControl<IAccordionProps, TAccordionEvents> {
	/** Внешний вид компонента */
	view: TAccordionView
}
