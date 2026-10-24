import type {
	IValueControl,
	IValueControlProps,
	TValueControlEvents,
} from '../../../base/value-control'
import type { TAria, TAriaAttributes, TChangeEvent, TValuePayload } from '../../../../common'
import type { IAccordionCollectionItemProps } from '../collection/types'

export type TAccordionArrowPlacement = 'start' | 'end'

export type TAccordionItemEvents = TValueControlEvents<string | number> & {
	/** change:text */
	'change:text': (payload: TValuePayload<string>) => void
	/** Запись своего `text` — подправить или отменить (`TChangeEvent`) */
	'change:text:before': (e: TChangeEvent<string>) => void
	/** change:arrowPlacement */
	'change:arrowPlacement': (value: TAccordionArrowPlacement) => void
	/** change:contentAria — набор атрибутов панели изменился */
	'change:contentAria': (value: TAriaAttributes) => void
	/** change:id — свой `id` заголовка секции */
	'change:id': (value: string | undefined) => void
}

export interface IAccordionItemProps
	extends IValueControlProps<string | number>, IAccordionCollectionItemProps {
	/** Текст заголовка элемента */
	text?: string
	/** Позиция иконки-стрелки */
	arrowPlacement?: TAccordionArrowPlacement
	/**
	 * Свой `id` заголовка секции. Не задан — у заголовка `id` от монтирования.
	 *
	 * Свой главнее: на `id` заголовка ссылается панель (`aria-labelledby`), и
	 * ссылка ведёт на тот `id`, что стоит в разметке.
	 */
	id?: string
}

export interface IAccordionItem<
	TProps extends IAccordionItemProps = IAccordionItemProps,
	TEvents extends TAccordionItemEvents = TAccordionItemEvents,
> extends IValueControl<string | number, TProps, TEvents> {
	/** Текст заголовка элемента */
	text: string
	/** Позиция иконки-стрелки */
	arrowPlacement: TAccordionArrowPlacement
	/** ARIA раскрывающейся панели: роль — секция, `id` и ссылку на заголовок — плагин */
	readonly contentAria: TAria
	/** Свой `id` заголовка; не задан — `undefined`, и у заголовка `id` от монтирования */
	id: string | undefined
}
