import type { ElementType, ReactElement } from 'react'
import { Elevate, renderSlot, toAriaProps, toRootProps } from '../../../adapter'
import { useSetupSelectGroup } from './setup.component'
import type { SelectGroupProps } from './base.component'

/**
 * SelectGroup — опции списка панели под общей подписью, как `Select.Group` у
 * Vue.
 *
 * Корень по `tag` несёт три набора ядра: `role="group"` и `aria-labelledby` на
 * подпись — имя группы. Опции входят в коллекцию Select сквозь группу:
 * подсветка стрелками ходит по ним, как по одному списку.
 *
 * Подпись — текст `label`; нет подписи — нет и её узла, и ссылки на неё у
 * группы тоже нет. Набор подписи (`labelAria`) — её `id` и роль
 * `presentation`: список панели — `listbox`, а в нём ARIA пускает только
 * опции и группы.
 *
 * Опции — в слое лифта группы (`Elevate`): опция, смонтированная внутри,
 * прочтёт ключ группы при своей сборке и войдёт в её группу.
 */
export function SelectGroup(props: SelectGroupProps): ReactElement | null {
	const { ref, forwardProps, state, layer } = useSetupSelectGroup(props)

	const { rendered, tag, label, labelAria, attrs, aria, dataset } = state

	if (!rendered) return null

	const Tag = tag as ElementType

	return (
		<Tag {...toRootProps(ref, state, [attrs, aria, dataset], forwardProps)}>
			{label ? (
				<div className="so-select-group__label" {...toAriaProps(labelAria)}>
					{label}
				</div>
			) : null}
			<Elevate layer={layer}>{renderSlot(props.children)}</Elevate>
		</Tag>
	)
}
