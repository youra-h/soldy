<script lang="ts">
	import { Dynamic, roleIcon, toControlAttrs, toRootForward, toRootProps } from '../../../adapter'
	import { Button } from '../../button'
	import { Icon } from '../../icon'
	import { setupSelectItem } from './setup.component'
	import type { SelectItemAttributes, SelectItemProps } from './base.component'

	let { ref = $bindable(), ...props }: SelectItemProps = $props()
	const mountId = $props.id()

	const binding = setupSelectItem(() => props, mountId, (node) => (ref = node))
	const state = binding.state
	const context = binding.context

	// Отметка без слота — иконка из пакета по роли: метка одна на роль
	const CHECK = roleIcon('check')

	/**
	 * Выбор — клик по корню, как `@click` корня у Vue: выбирает через Select
	 * (`adapters.select.choose()`), а выключенной опции отказывает он сам.
	 * Клик потребителя стоит на строке и приходит раньше, всплытием.
	 */
	function choose(): void {
		context?.adapters.select.choose()
	}
</script>

<!--
	SelectItem — опция списка панели: корень по `tag` (по умолчанию `div`) и
	строка внутри — `Button` на `span`, как у Vue.

	Наборы ядра стоят на двух элементах. Корень несёт `dataset`, `attrs` и место
	в коллекции (`order`): опции стоят флексом по месту в составе. Строка несёт
	`aria` — вся ARIA опции на элементе, который и есть опция: `role="option"`
	от ядра, `id` и `aria-selected` от коллекции, — и тот же `dataset`: фон
	при подсветке и выборе тема рисует на самой кнопке и читает
	`data-highlighted` и `data-selected` с неё. Набор опции ложится поверх того,
	что `Button` пишет себе сам: `role="option"` перекрывает `role="button"`, а
	`tabindex="-1"` выводит строку из обхода — фокус остаётся на поле. Атрибуты
	потребителя делятся, как у Vue: класс и стиль — корню, остальное — строке,
	поверх её наборов.

	Тег строки фиксирован (`span`), а не берётся из `tag` опции: `tag` — тег
	корня, под фиксированный тег строки написан `TSelectItem._ariaTag`. Вида у
	строки нет: значения вида объявляет тема, строку опции она красит по
	контексту (`.so-select-item`).

	Обёртка отметки рисуется, пока `indicator` не `none`, — и у невыбранных
	тоже: она резервирует место, и строка не прыгает при выборе. Иконка внутри
	— только у выбранной, слот `indicator-icon` подменяет её. `aria-hidden`:
	состояние скринридеру объявляет `aria-selected`.
-->
{#snippet mark()}
	<span class="so-select-item__indicator" aria-hidden="true">
		{#if props['indicator-icon']}
			{@render props['indicator-icon']({ selected: state.selected ?? false })}
		{:else if state.selected}
			<Icon embedded="select.indicator" tag={CHECK} size={state.size} />
		{/if}
	</span>
{/snippet}

{#if state.rendered}
	<Dynamic
		tag={state.tag}
		attributes={{
			...toRootProps(state, [state.dataset, state.attrs], toRootForward(binding.forwardProps)),
			onclick: choose,
		}}
		attach={binding.attachElement}
	>
		<Button
			embedded="select.row"
			tag="span"
			tabindex={-1}
			size={state.size}
			variant={state.variant}
			disabled={state.disabled}
			{...state.aria}
			{...state.dataset}
			{...toControlAttrs<SelectItemAttributes>(binding.forwardProps)}
		>
			{#snippet leading()}
				{#if state.indicator === 'start'}{@render mark()}{/if}{@render props.leading?.()}
			{/snippet}
			{#if props.children}
				{@render props.children({
					text: state.text ?? '',
					selected: state.selected ?? false,
				})}
			{:else}
				{state.text}
			{/if}
			{#snippet trailing()}
				{@render props.trailing?.()}{#if state.indicator === 'end'}{@render mark()}{/if}
			{/snippet}
		</Button>
	</Dynamic>
{/if}
