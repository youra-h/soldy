<script lang="ts">
	import { Dynamic, roleIcon, toRootProps } from '../../adapter'
	import { Button } from '../button'
	import { Frame } from '../frame'
	import { Icon } from '../icon'
	import { setupPopover } from './setup.component'
	import type { PopoverProps } from './base.component'

	let { ref = $bindable(), ...props }: PopoverProps = $props()
	const mountId = $props.id()

	const binding = setupPopover(() => props, mountId, (node) => (ref = node))
	const state = binding.state
	const ctrl = binding.ctrl

	const CLOSE = roleIcon('close')

	function close(): void {
		ctrl.open = false
	}
</script>

<!--
	Триггер — внутри корня: нажатие по открытому триггеру — нажатие внутри владельца, и панель не
	мигает. `lazyMount` прячет только сниппет — обёртка содержимого остаётся. Содержимое раньше
	крестика: фокус при открытии встаёт на первый контрол, крестик — последняя остановка Tab.
	Триггер и панель стоят вплотную: пробел Svelte оставил бы в корне текстом.
-->
{#if state.rendered}
	<Dynamic
		tag={state.tag}
		attributes={toRootProps(state, [state.attrs, state.dataset], binding.forwardProps)}
		attach={binding.attachElement}
	>
		{@render props.trigger?.({
			triggerAria: state.triggerAria ?? {},
			triggerDataset: state.triggerDataset ?? {},
		})}<Frame
			embedded="popover.frame"
			class="so-popover__panel"
			tabindex={-1}
			visible={state.open}
			contained={state.contained}
			position="fixed"
			anchor_anchor={binding.rootElement}
			anchor_placement={state.placement}
			anchor_offset={8}
			{...state.aria}
			{...state.panelDataset}
			{...state.dismiss_ownerAttribute}
		>
			{#if state.handleRendered}
				<div class="so-popover__handle" aria-hidden="true"></div>
			{/if}
			<div class="so-popover__content">
				{#if state.contentRendered}{@render props.children?.()}{/if}
			</div>
			{#if state.closable}
				<Button
					embedded="popover.close"
					type="button"
					class="so-popover__close"
					onclick={close}
					{...state.closeAria}
				>
					{#if props['close-icon']}
						{@render props['close-icon']()}
					{:else}
						<Icon embedded="popover.close-icon" tag={CLOSE} />
					{/if}
				</Button>
			{/if}
		</Frame>
	</Dynamic>
{/if}
