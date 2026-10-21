import type { ElementType, ReactElement } from 'react'
import { Elevate, renderSlot, toAriaProps, toRootProps } from '../../../adapter'
import { useSetupMenuGroup } from './setup.component'
import type { MenuGroupProps } from './base.component'

/**
 * MenuGroup — пункты меню под общей подписью, как `Menu.Group` у Vue.
 *
 * Корень по `tag` несёт три набора ядра: `role="group"` и `aria-labelledby` на
 * подпись — имя группы. Пункты входят в коллекцию меню сквозь группу:
 * навигация ходит по ним, как по одному списку.
 *
 * Подпись — текст `label`; нет подписи — нет и её узла, и ссылки на неё у
 * группы тоже нет. `id` подписи — в её наборе (`labelAria`): подпись —
 * разметка без своего экземпляра.
 *
 * Пункты — в слое лифта группы (`Elevate`): пункт, смонтированный внутри,
 * прочтёт ключ группы при своей сборке и войдёт в её группу.
 */
export function MenuGroup(props: MenuGroupProps): ReactElement | null {
	const { ref, forwardProps, state, layer } = useSetupMenuGroup(props)

	const { rendered, tag, label, labelAria, attrs, aria, dataset } = state

	if (!rendered) return null

	const Tag = tag as ElementType

	// Наборы ядра, поверх — атрибуты снаружи, `ref` адаптера последним
	return (
		<Tag {...toRootProps(ref, state, [attrs, aria, dataset], forwardProps)}>
			{label ? (
				<div className="so-menu-group__label" {...toAriaProps(labelAria)}>
					{label}
				</div>
			) : null}
			<Elevate layer={layer}>{renderSlot(props.children)}</Elevate>
		</Tag>
	)
}
