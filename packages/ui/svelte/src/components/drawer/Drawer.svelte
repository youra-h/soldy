<script lang="ts">
	import type { TAttributesMap } from '@soldy-ui/core'
	import { Dynamic, Teleport, roleIcon, toRootProps, toShownStyleText } from '../../adapter'
	import { Button } from '../button'
	import { Icon } from '../icon'
	import { setupDrawer } from './setup.component'
	import type { DrawerProps } from './base.component'

	let { ref = $bindable(), ...props }: DrawerProps = $props()
	const mountId = $props.id()

	const binding = setupDrawer(() => props, mountId, (node) => (ref = node))
	const state = binding.state
	const ctrl = binding.ctrl

	// Первым, под наборами ядра: фокус встаёт на панель, когда внутри нечего фокусировать
	const PANEL: TAttributesMap = { tabindex: '-1' }

	const CLOSE = roleIcon('close')
</script>

<!--
	Подложка и панель — соседи, подложка раньше: слой у них один, и панель поверх просто порядком.
	Порядок в панели — полоса жеста, заголовок, тело, подвал, крестик: он последняя остановка Tab.
	Крестик прячется `rendered`: тема опирается на его отсутствие в DOM. Узлы стоят вплотную:
	пробел Svelte оставил бы текстом, а пустые заголовок и подвал тема сворачивает по `:empty`.
-->
{#if state.rendered}
	<Teleport to={state.target} disabled={state.contained}>
		<div
			class="so-drawer__backdrop"
			style={toShownStyleText(state.layout_backdropStyles, state.visible === true)}
			{...state.backdropDataset}
		></div><Dynamic
			tag={state.tag}
			attributes={toRootProps(
				state,
				[PANEL, state.attrs, state.aria, state.dataset, state.dismiss_ownerAttribute],
				binding.forwardProps,
			)}
			attach={binding.attachElement}
		>
			{#if state.handleRendered}
				<div class="so-drawer__handle" aria-hidden="true"></div>
			{/if}
			<h2 class="so-drawer__title" {...state.titleAria}>{@render props.title?.()}</h2>
			<div class="so-drawer__body">{@render props.children?.()}</div>
			<div class="so-drawer__footer">{@render props.footer?.()}</div>
			<Button
				embedded="drawer.close"
				type="button"
				class="so-drawer__close"
				rendered={state.closable}
				onclick={() => ctrl.requestClose('button')}
				{...state.closeAria}
			>
				{#if props['close-icon']}
					{@render props['close-icon']()}
				{:else}
					<Icon embedded="drawer.close-icon" tag={CLOSE} />
				{/if}
			</Button>
		</Dynamic>
	</Teleport>
{/if}
