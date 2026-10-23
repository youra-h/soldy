<script lang="ts">
	import type { TToastsItemType } from '@soldy-ui/core'
	import { Dynamic, Teleport, toRootProps } from '../../adapter'
	import { ToastsItem } from './item'
	import { setupToasts } from './setup.component'
	import type { ToastsProps } from './base.component'

	let { ref = $bindable(), ...props }: ToastsProps = $props()
	const mountId = $props.id()

	const binding = setupToasts(() => props, mountId, (node) => (ref = node))
	const state = binding.state
</script>

<!--
	`children` — само приложение, вне условия региона: оно рисуется и без него. Регион стоит
	всегда, и пустым: живая область должна быть в документе до первого тоста. Слоты тоста
	отдаются ему, только когда заданы менеджеру: сниппет непрозрачен. Приложение и регион стоят
	вплотную: пробел Svelte оставил бы в разметке родителя текстом.
-->
{@render props.children?.()}{#if state.rendered}
	<Teleport to={state.target}>
		<Dynamic
			tag={state.tag}
			attributes={toRootProps(
				state,
				[state.attrs, state.aria, state.dataset],
				binding.forwardProps,
			)}
			attach={binding.attachElement}
		>
			<ol class="so-toasts__list">
				{#each state.shown ?? [] as item (item.uid)}
					{#snippet icon(scope: { type: TToastsItemType | undefined })}
						{@render props['item-icon']?.({ ...scope, item })}
					{/snippet}
					{#snippet text(scope: { text: string })}
						{@render props.item?.({ ...scope, item })}
					{/snippet}
					{#snippet content()}
						{@render props['item-content']?.({ item })}
					{/snippet}
					{#snippet closeIcon()}
						{@render props['item-close-icon']?.({ item })}
					{/snippet}
					<ToastsItem
						ctrl={item}
						icon={props['item-icon'] ? icon : undefined}
						content={props['item-content'] ? content : undefined}
						close-icon={props['item-close-icon'] ? closeIcon : undefined}
						children={props.item ? text : undefined}
					/>
				{/each}
			</ol>
		</Dynamic>
	</Teleport>
{/if}
