<script lang="ts">
	import {
		Dynamic,
		fieldText,
		roleIcon,
		toControlAttrs,
		toRootForward,
		toRootProps,
	} from '../../adapter'
	import { Button } from '../button'
	import { Icon } from '../icon'
	import { setupInput } from './setup.component'
	import type { InputAttributes, InputProps } from './base.component'

	const props: InputProps = $props()
	const mountId = $props.id()

	const binding = setupInput(() => props, mountId)
	const state = binding.state
	const ctrl = binding.ctrl

	// Текст поля — свойством узла и только когда разошёлся с узлом: в спреде
	// Svelte писал бы его на каждое нажатие (`fieldText`)
	const text = fieldText(() => state.value)

	// Глиф кнопки очистки — метка роли: `tag` у Icon — корень, а не роль
	const CLOSE = roleIcon('close')

	/**
	 * Клик кнопки очистки — нативный клик её `TActionPlugin` (`onActionClick`):
	 * всплытие гасится у самого события, и предок, который слушает клик по полю
	 * (select-only Select открывает по нему панель), его не получит.
	 */
	function clear(event: MouseEvent): void {
		event.stopPropagation()
		ctrl.clear()
	}
</script>

<!--
	Input — текстовое поле: корень по `tag` (по умолчанию `div`) и `<input>`
	внутри, по сторонам — слоты `leading` и `trailing`.

	Наборы ядра стоят на разных элементах: `attrs` (`dir`) — на корне, `aria` —
	на `<input>`. Нативные `disabled`, `readonly` и `required` поля проводит
	разметка, поэтому ARIA-дублей ядро рядом с ними не пишет. Атрибуты
	потребителя делятся, как у Vue: класс и стиль — корню, всё остальное —
	полю, поверх его `aria`.

	Текст поля ведёт ядро: в ядро его несёт плагин ввода, в узел — attachment
	поля (`fieldText`), и только когда текст разошёлся с узлом.

	Слоты стоят по сторонам поля, а не внутри него: `<input>` детей не имеет.
	Обёртка слота рисуется, только если в неё есть что положить; содержимое
	получает сам инстанс поля — кнопке рядом с полем нужны его значение и
	методы.

	Кнопка очистки — первой в обёртке у конца поля, перед `trailing`, как у
	Vue: по `clearable`, выключена вместе с полем, `readonly` её не гасит:
	select-only Select и есть `readonly`, а очистка там работает. Имя ядро
	собирает с именем поля (`clearAria`), очищает команда поля `clear`. Своя
	кнопка — слот `clear` с командой в scope: заменяет встроенную целиком и
	рисуется, когда задана.

	У кнопки нет `view`: значения вида объявляет тема, и разметка библиотеки их
	не знает. Кнопку тема красит по контексту (`.s-input__clear`).
-->
{#if state.rendered}
	<Dynamic
		tag={state.tag}
		attributes={toRootProps(state, [state.attrs], toRootForward(binding.forwardProps))}
		attach={binding.attachElement}
	>
		{#if props.leading}
			<div class="s-input__leading">{@render props.leading({ ctrl })}</div>
		{/if}
		<input
			type="text"
			id={state.id}
			name={state.name}
			disabled={state.disabled}
			readonly={state.readonly}
			required={state.required}
			placeholder={state.placeholder}
			{...state.aria}
			{...toControlAttrs<InputAttributes>(binding.forwardProps)}
			{...text}
		/>
		{#if state.clearable || props.clear || props.trailing}
			<!--
				Кнопка очистки и `trailing` стоят вплотную: пробел между блоками
				Svelte оставил бы в обёртке текстом.
			-->
			<div class="s-input__trailing">
				{#if props.clear}
					{@render props.clear({ clear: ctrl.clear })}
				{:else if state.clearable}
					<Button
						embedded="input.clear"
						class="s-input__clear"
						size={state.size}
						disabled={state.disabled}
						{...state.clearAria}
						onActionClick={clear}
					>
						<Icon embedded="input.clear-icon" tag={CLOSE} size={state.size} />
					</Button>
				{/if}{#if props.trailing}
					{@render props.trailing({ ctrl })}
				{/if}
			</div>
		{/if}
	</Dynamic>
{/if}
