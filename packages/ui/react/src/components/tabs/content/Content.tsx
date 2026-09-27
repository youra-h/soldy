import type { ElementType, ReactElement } from 'react'
import { renderSlot, toRootProps } from '../../../adapter'
import { useSetupTabsContent } from './setup.component'
import type { TabsContentProps } from './base.component'

/**
 * TabsContent — панель таба: корень по `tag`, внутри `children`.
 *
 * Рисуется, пока активен таб того же `value`. `rendered` остаётся за
 * потребителем — он может выключить панель совсем; активность решает лишь то,
 * показана ли она сейчас. Панели без таба (вне Tabs или без таба с её
 * значением) нечего показывать, и она пуста.
 *
 * Наборы на корне — `attrs` и `aria`, как у Vue: сторону связки с табом
 * (`role="tabpanel"`, `id`, `aria-labelledby`, `tabindex`) пишет в `aria`
 * панели связка, а не разметка.
 */
export function TabsContent(props: TabsContentProps): ReactElement | null {
	const { ref, forwardProps, state } = useSetupTabsContent(props)

	const { rendered, active, tag, attrs, aria } = state

	if (!rendered || !active) return null

	const Tag = tag as ElementType

	return (
		<Tag {...toRootProps(ref, state, [attrs, aria], forwardProps)}>
			{renderSlot(props.children)}
		</Tag>
	)
}
