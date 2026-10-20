<script lang="ts">
	import { Dynamic, textareaText, toControlAttrs, toRootForward, toRootProps } from '../../adapter'
	import { setupTextarea } from './setup.component'
	import type { TextareaAttributes, TextareaProps } from './base.component'

	let { ref = $bindable(), ...props }: TextareaProps = $props()
	const mountId = $props.id()

	const binding = setupTextarea(() => props, mountId, (node) => (ref = node))
	const state = binding.state

	// Текст поля — свойством узла и только когда разошёлся с узлом, на сервере
	// — содержимым `<textarea>` (`textareaText`)
	const text = textareaText(() => state.value)
</script>

<!--
	Textarea — многострочное поле: корень по `tag` (по умолчанию `div`) и
	`<textarea>` внутри, под ним — счётчик символов.

	Наборы ядра стоят на разных элементах, как у Input: `attrs` (`dir`) и
	`dataset` (`data-disabled`, `data-invalid`, `data-limit`) — на корне,
	`aria` — на `<textarea>`: тема красит рамку и счётчик по корню, а ошибку
	скринридеру объявляет поле. Нативные `rows`, `maxlength`, `disabled`,
	`readonly` и `required` поля проводит разметка, поэтому ARIA-дублей ядро
	рядом с ними не пишет. Атрибуты потребителя делятся, как у Vue: класс и
	стиль — корню, всё остальное — полю, поверх его `aria`.

	Текст поля ведёт ядро: в ядро его несёт плагин ввода, в узел — attachment
	поля, и только когда текст разошёлся с узлом. Атрибут `value` у поля — для
	сервера: там он становится содержимым `<textarea>`, в браузере он пуст.
	Высоту по тексту пишет в узел плагин автороста.

	Счётчик — только при `counter`: текст «12 / 200» пишет плагин имён по
	локали поддерева (`names_counter`), а набор `counterAria` несёт его `id`.
	Поле ссылается на него `aria-describedby`, и текст звучит на фокусе поля, а
	не живым регионом на каждый символ.
-->
{#if state.rendered}
	<Dynamic
		tag={state.tag}
		attributes={toRootProps(
			state,
			[state.attrs, state.dataset],
			toRootForward(binding.forwardProps),
		)}
		attach={binding.attachElement}
	>
		<textarea
			id={state.id}
			name={state.name}
			rows={state.rows}
			maxlength={state.maxlength}
			disabled={state.disabled}
			readonly={state.readonly}
			required={state.required}
			placeholder={state.placeholder}
			{...state.aria}
			{...toControlAttrs<TextareaAttributes>(binding.forwardProps)}
			{...text.attributes}
			value={text.value}
		></textarea>
		{#if state.counter}
			<div class="so-textarea__counter" {...state.counterAria}>{state.names_counter}</div>
		{/if}
	</Dynamic>
{/if}
