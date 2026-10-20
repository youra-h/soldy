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
	import { setupNumberInput } from './setup.component'
	import type { NumberInputAttributes, NumberInputProps } from './base.component'

	let { ref = $bindable(), ...props }: NumberInputProps = $props()
	const mountId = $props.id()

	const binding = setupNumberInput(() => props, mountId, (node) => (ref = node))
	const state = binding.state
	const ctrl = binding.ctrl

	// Текст ввода — буфер правки ядра, свойством узла и только когда разошёлся
	// с узлом: в спреде Svelte писал бы его на каждое нажатие (`fieldText`)
	const text = fieldText(() => state.text)

	// Глифы кнопок — метки ролей: `tag` у Icon — корень, а не роль
	const CLOSE = roleIcon('close')
	const MINUS = roleIcon('minus')
	const PLUS = roleIcon('plus')

	/**
	 * Клик кнопки очистки — нативный клик её `TActionPlugin` (`onActionClick`):
	 * всплытие гасится у самого события, как `@click.stop` у Vue.
	 */
	function clear(event: MouseEvent): void {
		event.stopPropagation()
		ctrl.clear()
	}
</script>

<!--
	NumberInput — поле числа: ввод и кнопки шага «меньше» и «больше». Корень —
	коробка поля семьи Input: рисуется по `tag` (по умолчанию `div`), на нём —
	`attrs` (`dir` поля) и `dataset` (`data-disabled`, `data-invalid`): тема
	красит коробку и подпись поля формы `Field` по корню, а `aria` — у ввода.
	Атрибуты потребителя делятся, как у Vue: класс и стиль — корню, всё
	остальное — вводу, поверх его наборов.

	Порядок узлов — как у Vue: слот `leading`, ввод, обёртка у конца числа,
	кнопки шага, значение для формы. Кнопки — последними из видимых, у края
	поля: их место не зависит от того, чем заняты слоты.

	Ввод — `<input type="text">` с классом `so-number-input__input`: по нему
	ввод находят плагины поля, рядом в корне лежит скрытое поле формы. Текст —
	буфер правки ядра (`text`), а не `value`: пока набирают, набранное, после —
	строка формата. В узел его пишет attachment поля (`fieldText`), только когда
	текст разошёлся с узлом; на сервере — атрибутом `value`. Наборы ядра — в
	порядке Vue: `inputAttrs` (`dir` и `lang` числа, экранная клавиатура
	`inputmode`), `aria` (имя, справка, ошибка), `inputAria` (роль `spinbutton`
	и `aria-value*`). Ни проверки орфографии, ни автозаполнения: число — не
	слово. `name` у ввода нет — в форму уходит число, а не текст.

	Обёртка у конца числа и кнопка очистки — как у Input: кнопка первой, перед
	`trailing`, по `clearable`, выключена вместе с полем, `readonly` её не
	гасит. Имя ядро собирает с именем поля (`clearAria`), очищает команда поля
	`clear` — и значение, и набранный текст. Своя кнопка — слот `clear` с
	командой в scope.

	Кнопки шага — Button-детали внутри `so-number-input__stepper`: «меньше»,
	затем «больше», по классам `so-number-input__decrement` и `__increment` их
	находит плагин кнопок. Обработчиков у них нет: нажатие, удержание и клик
	скринридера ловит плагин на корне. Выключенность — у края, у выключенного
	поля и только для чтения, наборы — имя от локали и `tabindex="-1"`
	(`decrementAria`) и `data-pressed` удержания (`decrementDataset`), поверх
	того, что кнопка пишет себе сама. Значок — слот `decrement-icon` или
	`increment-icon`, иначе иконка роли `minus` или `plus` размером поля.

	Значение для формы — скрытое поле последним: `name`, `value` — число
	строкой («1234.5», а не «1 234,5 ₽»), без числа — пусто. Выключенное поле в
	форму не уходит.

	Узлы внутри обёрток стоят вплотную: пробел между блоками Svelte оставил бы
	в обёртке текстом.
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
		{#if props.leading}
			<div class="so-number-input__leading">{@render props.leading({ ctrl })}</div>
		{/if}
		<input
			type="text"
			class="so-number-input__input"
			id={state.id}
			placeholder={state.placeholder}
			disabled={state.disabled}
			readonly={state.readonly}
			required={state.required}
			autocomplete="off"
			spellcheck="false"
			{...state.inputAttrs}
			{...state.aria}
			{...state.inputAria}
			{...toControlAttrs<NumberInputAttributes>(binding.forwardProps)}
			{...text}
		/>
		{#if state.clearable || props.clear || props.trailing}
			<div class="so-number-input__trailing">
				{#if props.clear}
					{@render props.clear({ clear: ctrl.clear })}
				{:else if state.clearable}
					<Button
						embedded="number-input.clear"
						type="button"
						class="so-number-input__clear"
						size={state.size}
						disabled={state.disabled}
						{...state.clearAria}
						onActionClick={clear}
					>
						<Icon embedded="number-input.clear-icon" tag={CLOSE} size={state.size} />
					</Button>
				{/if}{#if props.trailing}
					{@render props.trailing({ ctrl })}
				{/if}
			</div>
		{/if}
		<div class="so-number-input__stepper">
			<Button
				embedded="number-input.decrement"
				type="button"
				class="so-number-input__decrement"
				size={state.size}
				disabled={state.decrementDisabled}
				{...state.decrementAria}
				{...state.decrementDataset}
			>
				{#if props['decrement-icon']}
					{@render props['decrement-icon']()}
				{:else}
					<Icon embedded="number-input.decrement-icon" tag={MINUS} size={state.size} />
				{/if}
			</Button><Button
				embedded="number-input.increment"
				type="button"
				class="so-number-input__increment"
				size={state.size}
				disabled={state.incrementDisabled}
				{...state.incrementAria}
				{...state.incrementDataset}
			>
				{#if props['increment-icon']}
					{@render props['increment-icon']()}
				{:else}
					<Icon embedded="number-input.increment-icon" tag={PLUS} size={state.size} />
				{/if}
			</Button>
		</div>
		<input
			type="hidden"
			name={state.name}
			value={state.value === undefined ? '' : String(state.value)}
			disabled={state.disabled}
		/>
	</Dynamic>
{/if}
