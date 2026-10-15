<script lang="ts">
	import { Dynamic, toRootProps } from '../../adapter'
	import { setupLabel } from './setup.component'
	import type { LabelProps } from './base.component'

	let { ref = $bindable(), ...props }: LabelProps = $props()
	const mountId = $props.id()

	const binding = setupLabel(() => props, mountId, (node) => (ref = node))
	const state = binding.state
</script>

<!--
	Label — подпись контрола. Корень рисуется по `tag`, по умолчанию `label`;
	модификаторы стороны, размера и варианта — на корне, тема читает всё отсюда.

	Связки через `for` и `id` нет: контрол — первый labelable-потомок `label`,
	поэтому клик по тексту переключает его, а текст становится его доступным
	именем. Внутри — только `span`: `div` и вложенный `label` HTML здесь
	запрещает, а описание или ошибка вошли бы в имя.

	Порядок в DOM один на все стороны: контрол, потом текст. Сторону рисует тема.

	- контрол — `children` (слот `default`): CheckBox, Switch или
	  RadioGroup.Item с `tag="span"` — корень радио сам `label`, а `label` в
	  `label` запрещён, забытый тег ловит плагин подписи. Обёртка выравнивает
	  контрол по первой строке текста;
	- текст — слот `content`, без него — проп `text`. Пустую обёртку тема
	  прячет по `:empty`, поэтому пустой текст не рисуется вовсе: в обёртке
	  остаётся только метка блока Svelte — комментарий, а его `:empty` не
	  видит. Пробелы по краям блока Svelte срезает сам, а между соседями
	  оставил бы — поэтому части стоят вплотную.
-->
{#if state.rendered}
	<Dynamic
		tag={state.tag}
		attributes={toRootProps(
			state,
			[state.attrs, state.aria, state.dataset],
			binding.forwardProps,
		)}
		attach={binding.attachElement}
	>
		<span class="so-label__control">{@render props.children?.()}</span><span
			class="so-label__text"
		>
			{#if props.content}
				{@render props.content()}
			{:else if state.text}
				{state.text}
			{/if}
		</span>
	</Dynamic>
{/if}
