<script lang="ts">
	import { Dynamic, roleIcon, toControlAttrs, toRootForward, toRootProps } from '../../../adapter'
	import { Button } from '../../button'
	import { Icon } from '../../icon'
	import { setupTagsItem } from './setup.component'
	import type { TagsItemAttributes, TagsItemProps } from './base.component'

	let { ref = $bindable(), ...props }: TagsItemProps = $props()
	const mountId = $props.id()

	const binding = setupTagsItem(() => props, mountId, (node) => (ref = node))
	const state = binding.state
	const context = binding.context
	// Строка — экземпляр, которым владеет тег (`TOwnedButton` на `div`): тег, размер, вариант,
	// выключенность и направление ей пишет тег, а роль и `tabindex` — его набор `aria`
	const row = binding.ctrl.row

	const CLOSE = roleIcon('close')

	// По `action:press`, а не клику: строка — `div`, клик из Enter и пробела даёт `TActionPlugin`
	function toggle(): void {
		context?.adapters.selection.toggle()
	}

	// Всплытие гасится у события: корни тега и набора отдали бы `action:press`,
	// и поле Select, в котором стоят теги, открыло бы панель
	function close(event: MouseEvent): void {
		event.stopPropagation()
		context?.adapters.tags.close()
	}
</script>

<!--
	Вид тега рисует корень, а не строка: фон и выбор обязаны покрывать и крестик рядом с ней.
	Крестик — сосед строки: потомки опции для скринридера презентационны, и его подпись
	приклеилась бы к названию тега. Строка и крестик вплотную: пробел Svelte оставил бы текстом.
-->
{#if state.rendered}
	<Dynamic
		tag={state.tag}
		attributes={toRootProps(
			state,
			[state.dataset, state.attrs],
			toRootForward(binding.forwardProps),
		)}
		attach={binding.attachElement}
	>
		<Button
			embedded="tags.row"
			ctrl={row}
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
		</Button><Button
			embedded="tags.close"
			type="button"
			rendered={state.tag_closable === true}
			class="so-tags-item__close"
			disabled={state.disabled}
			size={state.size}
			{...state.closeAria}
			onActionClick={close}
		>
			{#if props['close-icon']}
				{@render props['close-icon']()}
			{:else}
				<Icon embedded="tags.close-icon" tag={CLOSE} size={state.size} />
			{/if}
		</Button>
	</Dynamic>
{/if}
