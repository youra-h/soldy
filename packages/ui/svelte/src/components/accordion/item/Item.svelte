<script lang="ts">
	import type { Snippet } from 'svelte'
	import type { MouseEventHandler } from 'svelte/elements'
	import { Dynamic, roleIcon, toControlAttrs, toRootForward, toRootProps } from '../../../adapter'
	import { Button } from '../../button'
	import { Icon } from '../../icon'
	import { setupAccordionItem } from './setup.component'
	import type { AccordionItemAttributes, AccordionItemProps } from './base.component'

	let { ref = $bindable(), ...props }: AccordionItemProps = $props()
	const mountId = $props.id()

	const binding = setupAccordionItem(() => props, mountId, (node) => (ref = node))
	const state = binding.state
	const context = binding.context

	// Стрелка без слота — иконка из пакета по роли: метка одна на роль
	const ARROW = roleIcon('arrowRight')

	/**
	 * Атрибуты заголовка — всё от потребителя, кроме класса и стиля. Клик
	 * раскрывает или сворачивает секцию, потом зовёт клик потребителя:
	 * слушатели складываются, как у Vue.
	 */
	function headerAttributes() {
		const { onclick, ...header } = toControlAttrs<AccordionItemAttributes>(
			binding.forwardProps,
		)
		const toggle: MouseEventHandler<HTMLElement> = (event) => {
			context?.adapters.selection.toggle()
			onclick?.(event)
		}

		return { ...header, onclick: toggle }
	}
</script>

<!--
	AccordionItem — секция: корень по `tag` (по умолчанию `div`), внутри
	заголовок — `Button` — и панель, как у Vue.

	Наборы ядра стоят там же, где у Vue. Корень несёт `dataset`, `attrs` и место
	в коллекции (`order`): тема раскрывает панель по `data-selected` на нём.
	Заголовок несёт `aria` — `aria-expanded` пишет коллекция, сторону связки с
	панелью (`id`, `aria-controls`) — плагин секции. Панель несёт набор секции
	`contentAria` (`role="region"`, `id`, `aria-labelledby`): своего экземпляра
	у неё нет. Атрибуты потребителя делятся, как у ListBox.Item: класс и стиль —
	корню, остальное — заголовку, поверх его `aria`.

	Стрелка — по краю заголовка со стороны `arrowPlacement`. Слоты
	`leading-icon` и `trailing-icon` подменяют её, по умолчанию она — иконка
	пакета по роли `arrowRight`. Стрелка — в обёртке, и класс стрелки на
	обёртке, а не на иконке: тема поворачивает стрелку раскрытой секции по
	`.s-accordion-item__arrow`, и подменённая иконка поворачивается так же.
	Обёртка стоит, пока на её стороне стрелка по умолчанию или задан слот.
-->
{#snippet arrow(side: 'start' | 'end', slot: Snippet | undefined)}
	{#if slot || state.arrowPlacement === side}
		<span class="s-accordion-item__arrow">
			{#if slot}
				{@render slot()}
			{:else}
				<Icon embedded="accordion.arrow" tag={ARROW} size={state.size} />
			{/if}
		</span>
	{/if}
{/snippet}

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
			embedded="accordion.header"
			class="s-accordion-item__header"
			view={state.view}
			disabled={state.disabled}
			size={state.size}
			variant={state.variant}
			{...state.aria}
			{...headerAttributes()}
		>
			{#snippet leading()}
				{@render arrow('start', props['leading-icon'])}{@render props.leading?.()}
			{/snippet}
			{#if props.header}
				{@render props.header({
					text: state.text ?? '',
					selected: state.selected ?? false,
				})}
			{:else}
				{state.text}
			{/if}
			{#snippet trailing()}
				{@render props.trailing?.()}{@render arrow('end', props['trailing-icon'])}
			{/snippet}
		</Button><div class="s-accordion-item__body">
			<div class="s-accordion-item__content" {...state.contentAria}>
				{@render props.children?.()}
			</div>
		</div>
	</Dynamic>
{/if}
