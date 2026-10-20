import type { ElementType, ReactElement } from 'react'
import { Elevate, renderSlot, toAriaProps, toRootProps } from '../../../adapter'
import { useSetupListBoxGroup } from './setup.component'
import type { ListBoxGroupProps } from './base.component'

/**
 * ListBoxGroup — элементы списка под общей подписью, как `ListBox.Group` у Vue.
 *
 * Корень по `tag` несёт три набора ядра: `role="group"` и `aria-labelledby` на
 * подпись — имя группы. Элементы входят в коллекцию списка сквозь группу:
 * навигация ходит по ним, как по одному списку.
 *
 * Подпись — текст `label`; нет подписи — нет и её узла, и ссылки на неё у
 * группы тоже нет. Набор подписи (`labelAria`) — её `id` и роль
 * `presentation`: в `listbox` ARIA пускает только опции и группы.
 *
 * Элементы — в слое лифта группы (`Elevate`): элемент, смонтированный внутри,
 * прочтёт ключ группы при своей сборке и войдёт в её группу.
 */
export function ListBoxGroup(props: ListBoxGroupProps): ReactElement | null {
	const { ref, forwardProps, state, layer } = useSetupListBoxGroup(props)

	const { rendered, tag, label, labelAria, attrs, aria, dataset } = state

	if (!rendered) return null

	const Tag = tag as ElementType

	return (
		<Tag {...toRootProps(ref, state, [attrs, aria, dataset], forwardProps)}>
			{label ? (
				<div className="so-list-box-group__label" {...toAriaProps(labelAria)}>
					{label}
				</div>
			) : null}
			<Elevate layer={layer}>{renderSlot(props.children)}</Elevate>
		</Tag>
	)
}
