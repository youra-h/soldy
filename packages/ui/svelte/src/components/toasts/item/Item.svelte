<script lang="ts">
	import type { TToastsItemType } from '@soldy-ui/core'
	import { Dynamic, isToastRender, roleIcon, toRootProps, type TRoleIcon } from '../../../adapter'
	import { Button } from '../../button'
	import { Icon } from '../../icon'
	import { ProgressSpinner } from '../../progress-spinner'
	import { setupToastsItem } from './setup.component'
	import type { ToastsItemProps } from './base.component'

	let { ref = $bindable(), ...props }: ToastsItemProps = $props()
	const mountId = $props.id()

	const binding = setupToastsItem(() => props, mountId, (node) => (ref = node))
	const state = binding.state
	const ctrl = binding.ctrl

	/** Значок у каждого вида свой: в режиме принудительных цветов вид различает только глиф. */
	const TYPE_ICONS = {
		info: roleIcon('info'),
		success: roleIcon('success'),
		warning: roleIcon('warning'),
		error: roleIcon('error'),
	} satisfies Record<TToastsItemType, TRoleIcon>

	/** Значок обычного сообщения — тоста без вида. */
	const NOTIFICATION = roleIcon('notification')

	const CLOSE = roleIcon('close')
</script>

<!--
	Корню состояние отдаётся поимённо, без `order`: CSS-свойства `order` у тоста нет, `order`
	фасада — глубина в стопке. Плашка — отдельный узел: место растёт и схлопывается переходом
	высоты без замеров, а плашка своего размера не меняет. Крестик — последним: последняя
	остановка Tab. Вокруг частей пробелов нет: пустую часть тема сворачивает по `:empty`.
-->
{#if state.rendered}
	<Dynamic
		tag={state.tag}
		attributes={toRootProps(
			{ classes: state.classes, visible: state.visible },
			[state.attrs, state.aria, state.dataset],
			binding.forwardProps,
			{ '--so-toasts-depth': state.order ?? '' },
		)}
		attach={binding.attachElement}
	>
		<div class="so-toasts-item__card">
			<span class="so-toasts-item__icon" aria-hidden="true">
				{#if state.loading}
					<ProgressSpinner embedded="toasts.spinner" indeterminate />
				{:else if props.icon}
					{@render props.icon({ type: state.type })}
				{:else}
					<Icon
						embedded="toasts.icon"
						tag={state.type ? TYPE_ICONS[state.type] : NOTIFICATION}
					/>
				{/if}
			</span>
			<div class="so-toasts-item__body">
				<div class="so-toasts-item__text">
					{#if props.children}
						{@render props.children({ text: state.text ?? '' })}
					{:else}
						{state.text}
					{/if}
				</div>
				<div class="so-toasts-item__description">{state.description}</div>
				<div class="so-toasts-item__content">
					{#if props.content}
						{@render props.content()}
					{:else if isToastRender(state.render)}
						{@const Render = state.render}
						<Render toast={ctrl} />
					{/if}
				</div>
			</div>
			<Button
				embedded="toasts.close"
				type="button"
				class="so-toasts-item__close"
				rendered={state.closable}
				onclick={() => ctrl.close()}
				{...state.closeAria}
			>
				{#if props['close-icon']}
					{@render props['close-icon']()}
				{:else}
					<Icon embedded="toasts.close-icon" tag={CLOSE} />
				{/if}
			</Button>
		</div>
	</Dynamic>
{/if}
