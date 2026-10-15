import { Show, type JSX } from 'solid-js'
import { Dynamic } from 'solid-js/web'
import { createRootProps, renderSlot, rootTag } from '../../../adapter'
import { setupTabsContent } from './setup.component'
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
export function TabsContent(props: TabsContentProps): JSX.Element {
	const binding = setupTabsContent(props)
	const state = binding.state
	// Наборы ядра, поверх — атрибуты снаружи, `ref` адаптера последним
	const root = createRootProps(() => ({
		state,
		sets: [state.attrs, state.aria],
		forward: binding.forwardProps(),
	}))

	return (
		<Show when={state.rendered && state.active}>
			<Dynamic {...root()} component={rootTag(state.tag)} ref={binding.ref}>
				{renderSlot(props.children)}
			</Dynamic>
		</Show>
	)
}
