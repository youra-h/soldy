import type { ElementType, ReactElement } from 'react'
import { Elevate, renderSlot, toAriaProps, toRootProps } from '../../../adapter'
import { useSetupMenuRadioGroup } from './setup.component'
import type { MenuRadioGroupProps } from './base.component'

/**
 * MenuRadioGroup — переключатели меню под общей подписью, как
 * `Menu.RadioGroup` у Vue. Разметка — как у группы меню (`MenuGroup`):
 * `role="group"` и `aria-labelledby` на подпись — имя группы. Роли
 * `radiogroup` нет: в меню группа переключателей — `group` (APG).
 * Переключатели входят в коллекцию меню сквозь группу: навигация ходит по ним,
 * как по одному списку.
 *
 * Подпись — текст `label`; нет подписи — нет и её узла, и ссылки на неё у
 * группы тоже нет. `id` подписи — в её наборе (`labelAria`).
 *
 * Переключатели — в слое лифта группы (`Elevate`): там их ждут ключ группы
 * для группировки меню и сама группа, в которой отмечен один.
 */
export function MenuRadioGroup(props: MenuRadioGroupProps): ReactElement | null {
	const { ref, forwardProps, state, layer } = useSetupMenuRadioGroup(props)

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
