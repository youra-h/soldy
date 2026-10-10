import type { ElementType, ReactElement } from 'react'
import { Elevate, hasSlot, relaySlot, renderSlot, toRootProps } from '../../adapter'
import { RadioGroupItem } from './item'
import { useSetupRadioGroup } from './setup.component'
import type { RadioGroupProps } from './base.component'

/**
 * RadioGroup — группа радио, «один из N»: корень по `tag` (по умолчанию `div`).
 *
 * Корень — контейнер группы. Набор `aria` владельца — на нём, как у Vue:
 * `role="radiogroup"` пишет ядро, имя из `aria_label` / `aria_labelledBy` —
 * `TAriaPlugin`. Стилей у контейнера в теме нет: радио одной группы стоят где
 * угодно внутри — в строках списка, в ячейках таблицы, — и раскладку задаёт
 * потребитель.
 *
 * Радио — дети (`<RadioGroup.Item>`), а без детей — `shown` коллекции, по
 * `RadioGroupItem` на элемент. Слот подписи статический и получает радио
 * через scope (`item`), как у остальных коллекций, — вместе со scope подписи
 * самого радио (`active`): радио получает его функцией (`relaySlot`), а не
 * готовым узлом.
 *
 * Всё содержимое — в слое лифта группы (`Elevate`): радио, смонтированное
 * внутри, прочтёт движок и регистратор этой группы и при коммите войдёт в её
 * коллекцию.
 */
export function RadioGroup(props: RadioGroupProps): ReactElement | null {
	const { ref, forwardProps, state, layer } = useSetupRadioGroup(props)

	const { rendered, tag, shown, attrs, aria, dataset } = state

	if (!rendered) return null

	const Tag = tag as ElementType

	return (
		<Tag {...toRootProps(ref, state, [attrs, aria, dataset], forwardProps)}>
			<Elevate layer={layer}>
				{hasSlot(props.children)
					? renderSlot(props.children)
					: shown?.map((item) => (
							<RadioGroupItem key={item.uid} ctrl={item}>
								{relaySlot(props.item, { item })}
							</RadioGroupItem>
						))}
			</Elevate>
		</Tag>
	)
}
