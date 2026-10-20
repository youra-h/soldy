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

	// Глиф крестика без слота — метка роли: `tag` у Icon — корень, а не роль
	const CLOSE = roleIcon('close')

	/**
	 * Выбор — по `action:press` строки, а не по клику: строка — `div`, фокус
	 * держит она сама, и клик из Enter и пробела на ней делает её
	 * `TActionPlugin`. `press` не приходит на выключенный тег, а
	 * `TSelectionExtension.toggle` выключенность не проверяет.
	 */
	function toggle(): void {
		context?.adapters.selection.toggle()
	}

	/**
	 * Клик крестика — нативный клик его `TActionPlugin` (`onActionClick`), и
	 * всплытие гасится у самого события, как `@click.stop` у Vue: корни тега и
	 * набора отдали бы `action:press` на клик по крестику, а поле Select, в
	 * котором стоят теги, открыло бы по нему панель.
	 */
	function close(event: MouseEvent): void {
		event.stopPropagation()
		context?.adapters.tags.close()
	}
</script>

<!--
	TagsItem — тег: корень по `tag` (по умолчанию `div`), внутри строка —
	`Button` на `div` — и кнопка закрытия рядом с ней, как у Vue.

	Наборы ядра стоят там же, где у Vue. Корень — пилюля тега: на нём
	`dataset` (тема красит выбранный тег по `data-selected`), `attrs` и место в
	коллекции (`order`). Вид набора рисует корень, а не строка: фон, рамка,
	наведение и выбор обязаны покрывать и крестик, а он стоит рядом со строкой.
	Строке и крестику вид не передаётся — части тега тема красит по контексту
	(`.so-tags-item`).

	Строка несёт `aria` — роль по режиму набора (`listitem` без выбора, `option`
	с выбором), `aria-selected` и `tabindex` от коллекции: с выбором весь набор
	— одна остановка Tab, без выбора у строк `-1`. Набор перекрывает остановку,
	которую `Button` на `div` ставит себе сам. Атрибуты потребителя делятся,
	как у Vue: класс и стиль — корню, остальное — строке, поверх её `aria`.
	`direction` — явно: строка — свой узел, и направление письма ей передаётся,
	а не только наследуется. Тег строки фиксирован (`div`): `tag` — тег корня,
	под фиксированный тег строки написан `TTagsItem._ariaTag`.

	Кнопка закрытия — сосед строки, а не её часть: потомки опции для
	скринридера презентационны, и подпись крестика приклеилась бы к названию
	тега. Имя кнопке ядро собирает вместе с текстом тега (`closeAria`), в том же
	наборе — `tabindex="-1"` с выбором. Рисуется она по итогу закрываемости
	фасада (`tag_closable`), размер и `disabled` — явно: от строки она их не
	наследует. Строка и кнопка стоят вплотную: пробел между ними Svelte оставил
	бы текстом.
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
			tag="div"
			direction={state.direction}
			disabled={state.disabled}
			size={state.size}
			variant={state.variant}
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
