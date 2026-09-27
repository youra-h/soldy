import type { HTMLAttributes } from 'react'
import type { IAccordionItem } from '@soldy-ui/core'
import type { AccordionCollectionItemDescriptor, AccordionItemDescriptor } from '@soldy-ui/setup'
import type { EventProps, TDomAttributes, UseDomProps } from '../../../types'

/** События секции — свои (ядро и плагины) и фасада: раскрытость, порядок, вид. */
export type AccordionItemEventProps = EventProps<typeof AccordionItemDescriptor> &
	EventProps<typeof AccordionCollectionItemDescriptor>

/** Атрибуты секции: класс и стиль — корню, остальное — заголовку. */
export type AccordionItemAttributes = TDomAttributes<
	typeof AccordionItemDescriptor,
	HTMLAttributes<HTMLElement>,
	AccordionItemEventProps
>

/**
 * Пропсы секции. Членство в коллекции (`selected` — раскрыта) входит в
 * интерфейс пропсов ядра (`IAccordionItemProps`), и тип его несёт дескриптор
 * секции.
 */
export type AccordionItemProps = UseDomProps<
	typeof AccordionItemDescriptor,
	IAccordionItem,
	AccordionItemEventProps
>
