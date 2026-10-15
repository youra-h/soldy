import type { IAccordion } from '@soldy-ui/core'
import type { AccordionCollectionDescriptor, AccordionDescriptor } from '@soldy-ui/setup'
import type { EventProps, UseDomProps } from '../../types'

/**
 * События Accordion — свои (ядро и плагины) и фасада коллекции: режим и
 * раскрытые секции, состав, `engine:create`. Контекстов у аккордеона два, и
 * колбэки обоих — пропсы одного компонента.
 */
export type AccordionEventProps = EventProps<typeof AccordionDescriptor> &
	EventProps<typeof AccordionCollectionDescriptor>

/**
 * Пропсы Accordion. Коллекционные входы (`engine`, `items`, `mode`,
 * `trackBy`) отдельно не перечислены: они входят в интерфейс пропсов ядра
 * (`IAccordionProps`), и тип их несёт дескриптор компонента.
 */
export type AccordionProps = UseDomProps<
	typeof AccordionDescriptor,
	IAccordion,
	AccordionEventProps
>
