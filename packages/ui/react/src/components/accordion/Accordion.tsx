import type { ReactElement } from 'react'
import { Elevate, hasSlot, relaySlot, renderSlot, toRootProps } from '../../adapter'
import { AccordionItem } from './item'
import { useSetupAccordion } from './setup.component'
import type { AccordionProps } from './base.component'

/**
 * Accordion — набор раскрывающихся секций. На корне — `attrs`, как у Vue.
 *
 * Секции — дети (`<Accordion.Item>`), а без детей — `shown` коллекции, по
 * `AccordionItem` на элемент. Слоты элементов статические и получают элемент
 * через scope: `item` — заголовок, `item-leading` и `item-trailing` — по его
 * краям, `item-leading-icon` и `item-trailing-icon` — стрелки, `item-content`
 * — содержимое панели. Отдельного `Accordion.Content` нет: панель лежит внутри
 * секции и отдельно от неё не существует.
 *
 * Проброс целиком: у каждого слота секции есть `item-<слот>`, и scope у него —
 * scope слота секции плюс сама секция. Заголовок со своим scope секция
 * получает функцией (`relaySlot`), а не готовым узлом, — иначе `text` и
 * `selected` до слота аккордеона не дошли бы.
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
								leading-icon={renderSlot(props['item-leading-icon'], { item })}
								leading={renderSlot(props['item-leading'], { item })}
								header={relaySlot(props.item, { item })}
								trailing={renderSlot(props['item-trailing'], { item })}
								trailing-icon={renderSlot(props['item-trailing-icon'], { item })}
							>
								{renderSlot(props['item-content'], { item })}
							</AccordionItem>
						))}
			</Elevate>
		</div>
	)
}
