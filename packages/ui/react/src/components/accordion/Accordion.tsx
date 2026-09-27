import type { ReactElement } from 'react'
import { Elevate, hasSlot, renderSlot, toRootProps } from '../../adapter'
import { AccordionItem } from './item'
import { useSetupAccordion } from './setup.component'
import type { AccordionProps } from './base.component'

/**
 * Accordion — набор раскрывающихся секций. На корне — `attrs`, как у Vue.
 *
 * Секции — дети (`<Accordion.Item>`), а без детей — `shown` коллекции, по
 * `AccordionItem` на элемент. Слоты элементов статические и получают элемент
 * через scope: `item` — заголовок, `item-leading` и `item-trailing` — по его
 * краям, `item-content` — содержимое панели. Отдельного `Accordion.Content`
 * нет: панель лежит внутри секции и отдельно от неё не существует.
 *
 * Всё содержимое — в слое лифта аккордеона (`Elevate`): секция, смонтированная
 * внутри, прочтёт движок и регистратор этого аккордеона и при коммите войдёт в
 * его коллекцию.
 */
export function Accordion(props: AccordionProps): ReactElement | null {
	const { ref, forwardProps, state, layer } = useSetupAccordion(props)

	const { rendered, shown, attrs } = state

	if (!rendered) return null

	return (
		<div {...toRootProps(ref, state, [attrs], forwardProps)}>
			<Elevate layer={layer}>
				{hasSlot(props.children)
					? renderSlot(props.children)
					: shown?.map((item) => (
							<AccordionItem
								key={item.uid}
								ctrl={item}
								leading={renderSlot(props['item-leading'], { item })}
								header={renderSlot(props.item, { item })}
								trailing={renderSlot(props['item-trailing'], { item })}
							>
								{renderSlot(props['item-content'], { item })}
							</AccordionItem>
						))}
			</Elevate>
		</div>
	)
}
