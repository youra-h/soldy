<script lang="ts">
	import type { MouseEventHandler } from 'svelte/elements'
	import { Dynamic, roleIcon, toControlAttrs, toRootForward, toRootProps } from '../../../adapter'
	import { Button } from '../../button'
	import { Icon } from '../../icon'
	import { setupListBoxItem } from './setup.component'
	import type { ListBoxItemAttributes, ListBoxItemProps } from './base.component'

	let { ref = $bindable(), ...props }: ListBoxItemProps = $props()
	const mountId = $props.id()

	const binding = setupListBoxItem(() => props, mountId, (node) => (ref = node))
	const state = binding.state
	const context = binding.context

	// Отметка без слота — иконка из пакета по роли: метка одна на роль
	const CHECK = roleIcon('check')

	/**
	 * Атрибуты строки — всё от потребителя, кроме класса и стиля. Клик
	 * выбирает через список, потом зовёт клик потребителя: слушатели
	 * складываются, как у Vue.
	 */
	function rowAttributes() {
		const { onclick, ...row } = toControlAttrs<ListBoxItemAttributes>(binding.forwardProps)
		const choose: MouseEventHandler<HTMLElement> = (event) => {
			context?.adapters.list.choose()
			onclick?.(event)
		}

		return { ...row, onclick: choose }
	}
</script>

<!--
	ListBoxItem — элемент списка: корень по `tag` (по умолчанию `div`) и строка
	внутри — `Button`, как у Vue.

	Наборы ядра стоят на двух элементах. Корень несёт `dataset`, `attrs` и место
	в коллекции (`order`): тема читает `data-content-fit` с него. Строка несёт
	`aria` и тот же `dataset` — выбор и подсветку тема красит на `.s-button`.
	Атрибуты потребителя делятся так же, как у Vue: класс и стиль — корню,
	остальное — строке, поверх её наборов: `tabindex="-1"` элемента перекрывает
	`tabindex="0"`, который кнопка на `div` ставит себе сама.

	Тег строки фиксирован (`div`), а не берётся из `tag` элемента: `tag` — тег
	корня, под фиксированный тег строки написан `TListBoxItem._ariaTag`.

	Клик выбирает через `adapters.list.choose()`, а не `selection.toggle()`:
	выключенному элементу отказывает список, тем же путём, что и клавиатура.

	Обёртка отметки рисуется, пока `indicator` не `none`, — и у невыбранных
	тоже: она резервирует место. Иконка внутри — только у выбранного, слот
	`indicator-icon` подменяет её. `aria-hidden`: состояние скринридеру
	объявляет `aria-selected`, второй источник того же факта дал бы двойное
	объявление.
-->
{#snippet mark()}
	<span class="s-list-box-item__indicator" aria-hidden="true">
		{#if props['indicator-icon']}
			{@render props['indicator-icon']({ selected: state.selected ?? false })}
		{:else if state.selected}
			<Icon embedded="list-box.indicator" tag={CHECK} size={state.size} />
		{/if}
	</span>
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
			embedded="list-box.row"
			tag="div"
			view={state.view}
			disabled={state.disabled}
			size={state.size}
			variant={state.variant}
			{...state.aria}
			{...state.dataset}
			{...rowAttributes()}
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
