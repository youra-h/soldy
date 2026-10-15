<script lang="ts">
	import type { MouseEventHandler } from 'svelte/elements'
	import { Dynamic, roleIcon, toControlAttrs, toRootForward, toRootProps } from '../../../adapter'
	import { Button } from '../../button'
	import { Icon } from '../../icon'
	import { setupTabsItem } from './setup.component'
	import type { TabsItemAttributes, TabsItemProps } from './base.component'

	let { ref = $bindable(), ...props }: TabsItemProps = $props()
	const mountId = $props.id()

	const binding = setupTabsItem(() => props, mountId, (node) => (ref = node))
	const state = binding.state
	const context = binding.context

	// Глиф крестика без слота — метка роли: `tag` у Icon — корень, а не роль
	const CLOSE = roleIcon('close')

	/**
	 * Атрибуты строки — всё от потребителя, кроме класса и стиля. Клик
	 * активирует таб, потом зовёт клик потребителя: слушатели складываются, как
	 * у Vue.
	 */
	function rowAttributes() {
		const { onclick, ...row } = toControlAttrs<TabsItemAttributes>(binding.forwardProps)
		const activate: MouseEventHandler<HTMLElement> = (event) => {
			if (context) context.adapters.activation.active = true
			onclick?.(event)
		}

		return { ...row, onclick: activate }
	}

	/**
	 * Клик крестика — нативный клик его `TActionPlugin` (`onActionClick`), и
	 * всплытие гасится у самого события. Клик разметки Svelte делегирует корню
	 * приложения, и к нему событие уже прошло бы корни таба и набора — их
	 * `TActionPlugin` отдал бы `action:press` на клик по крестику. Vue гасит то
	 * же `@click.stop`.
	 */
	function close(event: MouseEvent): void {
		event.stopPropagation()
		context?.adapters.tabs.close()
	}
</script>

<!--
	TabsItem — таб: корень по `tag` (по умолчанию `div`), внутри строка —
	`Button` с `role="tab"` — и кнопка закрытия рядом с ней, как у Vue.

	Наборы ядра стоят там же, где у Vue. Корень несёт `dataset`, `attrs` и место
	в коллекции (`order`): тема красит активный таб по `data-selected` на нём.
	Строка несёт `aria` — вся ARIA таба на элементе, который и есть таб: роль от
	ядра, `aria-selected` и остановку Tab (`tabindex`) от коллекции, связку с
	панелью (`id`, `aria-controls`). Атрибуты потребителя делятся, как у
	ListBox.Item: класс и стиль — корню, остальное — строке, поверх её `aria`.

	Кнопка закрытия — сосед строки, а не её часть: интерактивный потомок у
	`<button role="tab">` HTML запрещает, а подпись крестика вошла бы в имя
	таба. Имя кнопке ядро собирает вместе с текстом таба (`closeAria`),
	рисуется она по итогу закрываемости фасада (`tab_closable`), размер и
	`disabled` — явно: от строки она их не наследует. Строка и кнопка стоят
	вплотную: пробел между ними Svelte оставил бы текстом.
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
			embedded="tabs.row"
			disabled={state.disabled}
			size={state.size}
			variant={state.variant}
			leading={props.leading}
			trailing={props.trailing}
			{...state.aria}
			{...rowAttributes()}
		>
			{#if props.children}
				{@render props.children({ text: state.text ?? '', active: state.active ?? false })}
			{:else}
				{state.text}
			{/if}
		</Button><Button
			embedded="tabs.close"
			rendered={state.tab_closable === true}
			class="so-tabs-item__close"
			disabled={state.disabled}
			size={state.size}
			{...state.closeAria}
			onActionClick={close}
		>
			{#if props['close-icon']}
				{@render props['close-icon']()}
			{:else}
				<Icon embedded="tabs.close-icon" tag={CLOSE} size={state.size} />
			{/if}
		</Button>
	</Dynamic>
{/if}
