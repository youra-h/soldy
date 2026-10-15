<script lang="ts">
	import { Dynamic, toRootProps } from '../../../adapter'
	import { setupTabsContent } from './setup.component'
	import type { TabsContentProps } from './base.component'

	let { ref = $bindable(), ...props }: TabsContentProps = $props()
	const mountId = $props.id()

	const binding = setupTabsContent(() => props, mountId, (node) => (ref = node))
	const state = binding.state
</script>

<!--
	TabsContent — панель таба: корень по `tag`, внутри `children`.

	Рисуется, пока активен таб того же `value`. `rendered` остаётся за
	потребителем — он может выключить панель совсем; активность решает лишь то,
	показана ли она сейчас. Панели без таба (вне Tabs или без таба с её
	значением) нечего показывать, и она пуста.

	Наборы на корне — `attrs` и `aria`, как у Vue: сторону связки с табом
	(`role="tabpanel"`, `id`, `aria-labelledby`, `tabindex`) пишет в `aria`
	панели связка, а не разметка.
-->
{#if state.rendered && state.active}
	<Dynamic
		tag={state.tag}
		attributes={toRootProps(state, [state.attrs, state.aria], binding.forwardProps)}
		attach={binding.attachElement}
	>
		{@render props.children?.()}
	</Dynamic>
{/if}
