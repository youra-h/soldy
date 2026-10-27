<script lang="ts">
	import { clickAction, Dynamic, roleIcon, toControlAttrs, toRootForward, toRootProps } from '../../../adapter'
	import { Button } from '../../button'
	import { ItemRow } from '../../item-row'
	import { Icon } from '../../icon'
	import { setupTagsItem } from './setup.component'
	import type { TagsItemAttributes, TagsItemProps } from './base.component'

	let { ref = $bindable(), ...props }: TagsItemProps = $props()
	const mountId = $props.id()

	const binding = setupTagsItem(() => props, mountId, (node) => (ref = node))
	const state = binding.state
	const context = binding.context

	const CLOSE = roleIcon('close')

	// По `action:press`, а не клику: строка — `div`, клик из Enter и пробела даёт `TActionPlugin`
	function toggle(): void {
		context?.adapters.selection.toggle()
	}

	// Stopped at the cross: the roots of the tag and the set would give `action:press`,
	// and the Select field the tags stand in would open its panel
	const close = clickAction((event) => {
		event.stopPropagation()
		context?.adapters.tags.close()
	})
</script>

<!--
	Вид тега рисует корень, а не строка: фон и выбор обязаны покрывать и крестик рядом с ней.
	Крестик — сосед строки: потомки опции для скринридера презентационны, и его подпись
	приклеилась бы к названию тега. Строка и крестик вплотную: пробел Svelte оставил бы текстом.
-->
<Dynamic
	rendered={state.rendered}
	tag={state.tag}
	attributes={toRootProps(
		state,
		[state.dataset, state.attrs],
		toRootForward(binding.forwardProps),
	)}
	attach={binding.attachElement}
>
	<ItemRow
		embedded="tags.row"
		tag="div"
		direction={state.direction}
		disabled={state.disabled}
		size={state.size}
		variant={state.variant}
		leading={props.leading}
		trailing={props.trailing}
		onActionPress={toggle}
		{...state.aria}
		{...toControlAttrs<TagsItemAttributes>(binding.forwardProps)}
	>
		{#if props.children}
			{@render props.children({
				text: state.text ?? '',
				selected: state.selected ?? false,
			})}
		{:else}
			{state.text}
		{/if}
	</ItemRow>{#if state.tag_closable === true}<Button
		embedded="tags.close"
		type="button"
		class="so-tags-item__close"
		disabled={state.disabled}
		size={state.size}
		{...state.closeAria}
		{@attach close}
	>
		{#if props['close-icon']}
			{@render props['close-icon']()}
		{:else}
			<Icon embedded="tags.close-icon" tag={CLOSE} size={state.size} />
		{/if}
	</Button>{/if}
</Dynamic>
