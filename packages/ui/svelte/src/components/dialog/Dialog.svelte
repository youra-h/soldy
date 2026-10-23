<script lang="ts">
	import type { TAttributesMap } from '@soldy-ui/core'
	import { Dynamic, Teleport, roleIcon, toRootProps, toShownStyleText } from '../../adapter'
	import { Button } from '../button'
	import { Icon } from '../icon'
	import { setupDialog } from './setup.component'
	import type { DialogProps } from './base.component'

	let { ref = $bindable(), ...props }: DialogProps = $props()
	const mountId = $props.id()

	const binding = setupDialog(() => props, mountId, (node) => (ref = node))
	const state = binding.state
	const ctrl = binding.ctrl

	// Первым, под наборами ядра: фокус встаёт на панель, когда внутри нечего фокусировать
	const PANEL: TAttributesMap = { tabindex: '-1' }

	const CLOSE = roleIcon('close')
	const MAXIMIZE = roleIcon('arrowsOutward')
	const RESTORE = roleIcon('arrowsInward')
</script>

<!--
	Подложка и панель — соседи, подложка раньше: слой у них один, и панель поверх просто порядком.
	Порядок в панели — заголовок, тело, подвал, кнопки: крестик — последняя остановка Tab. Кнопки
	прячутся `rendered`: тема опирается на их отсутствие в DOM. Узлы стоят вплотную: пробел Svelte
	оставил бы текстом, а пустые заголовок и подвал тема сворачивает по `:empty`.
-->
{#if state.rendered}
	<Teleport to={state.target}>
		<div
			class="so-dialog__backdrop"
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
			<h2 class="so-dialog__title" {...state.titleAria}>{@render props.title?.()}</h2>
			<div class="so-dialog__body" {...state.bodyAria}>{@render props.children?.()}</div>
			<div class="so-dialog__footer">{@render props.footer?.()}</div>
			<Button
				embedded="dialog.maximize"
				type="button"
				class="so-dialog__maximize"
				rendered={state.maximizable}
				onclick={() => ctrl.toggleMaximized()}
				{...state.maximizeAria}
			>
				{#if state.maximized}
					{#if props['restore-icon']}
						{@render props['restore-icon']()}
					{:else}
						<Icon embedded="dialog.restore-icon" tag={RESTORE} />
					{/if}
				{:else if props['maximize-icon']}
					{@render props['maximize-icon']()}
				{:else}
					<Icon embedded="dialog.maximize-icon" tag={MAXIMIZE} />
				{/if}
			</Button>
			<Button
				embedded="dialog.close"
				type="button"
				class="so-dialog__close"
				rendered={state.closable}
				onclick={() => ctrl.requestClose('button')}
				{...state.closeAria}
			>
				{#if props['close-icon']}
					{@render props['close-icon']()}
				{:else}
					<Icon embedded="dialog.close-icon" tag={CLOSE} />
				{/if}
			</Button>
		</Dynamic>
	</Teleport>
{/if}
