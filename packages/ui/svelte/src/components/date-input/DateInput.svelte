<script lang="ts">
	import { Dynamic, TextSpan, roleIcon, toRootProps } from '../../adapter'
	import { Button } from '../button'
	import { Icon } from '../icon'
	import { setupDateInput } from './setup.component'
	import type { DateInputProps } from './base.component'

	let { ref = $bindable(), ...props }: DateInputProps = $props()
	const mountId = $props.id()

	const binding = setupDateInput(() => props, mountId, (node) => (ref = node))
	const state = binding.state
	const ctrl = binding.ctrl

	// Глиф кнопки очистки — метка роли: `tag` у Icon — корень, а не роль
	const CLOSE = roleIcon('close')

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
	DateInput — поле даты из частей по формату локали: день, месяц и год, а у
	поля даты и времени — ещё час, минута, с точностью до секунды секунда и, у
	12-часового цикла, период суток, в порядке и с разделителями
	`Intl.DateTimeFormat#formatToParts`, как у Vue. Корень — коробка поля семьи
	Input: рисуется по `tag` (по умолчанию `div`), на нём `id` поля и наборы
	`attrs` (`dir` поля), `aria` (`role="group"`, имя — `aria_label` или
	`aria_labelledBy`) и `dataset` (`data-disabled`, `data-invalid`), поверх —
	атрибуты потребителя целиком: поля ввода, между которым их делить, у даты
	нет. `ref` — корень.

	Порядок узлов — как у Vue: слот `leading`, ряд частей, обёртка у конца поля,
	скрытое поле формы.

	Ряд частей — флекс, а не строка текста: каждая часть и каждый разделитель —
	своя коробка, иначе Chrome переносит начало протяжки мышью от левого края
	части в соседний текст. Направление и язык ряда — набор `segmentsAttrs`.
	Части и разделители — выход ядра `segments`, петля по ключу: ключ части —
	её тип, разделителя — место в формате. При наборе и при смене локали часть
	меняет текст и место, а её узел остаётся тем же — с фокусом на нём.

	Часть — `span` с наборами `attrs` (на сенсорном устройстве —
	`contenteditable` и `inputmode`), `aria` (`role="spinbutton"`, имя,
	`aria-value*`, остановка Tab, `id`) и `dataset` (`data-type`,
	`data-placeholder`). Её текст пишет только `TextSpan` адаптера, свойством
	`textContent`: на касание часть редактируемая, и браузер оставляет её
	пустой или из своих узлов, — текстовый узел Svelte в ней был бы вторым
	писателем, и его запись ушла бы мимо. Разделитель — литерал формата под
	`aria-hidden` (его `aria`), обычным текстом: он не редактируется.

	Обёртка у конца поля — по кнопке очистки, своей кнопке в слоте `clear` или
	слоту `trailing`. Кнопка очистки — та же, что у Input: первой, перед
	`trailing`, по `clearable`, выключена вместе с полем, `readonly` её не
	гасит. Имя ядро собирает с именем поля (`clearAria`), очищает команда поля
	`clear` — все части, и скрытые форматом тоже. Своя кнопка — слот `clear` с
	командой в scope.

	Обработчиков в разметке больше нет: клавиши, буфер обмена, выделение,
	контекстное меню и касание ловят плагины на корне.

	Значение для формы — скрытое поле последним: `name`, `value` — дата строкой,
	пока значение не собрано — пусто. Выключенное поле в форму не уходит.

	Узлы стоят вплотную: пробел между блоками Svelte оставил бы текстом в
	корне, в обёртке и в ряду частей — а текст ряда плагин буфера обмена копирует
	целиком.
-->
{#if state.rendered}
	<Dynamic
		tag={state.tag}
		attributes={{
			id: state.id,
			...toRootProps(state, [state.attrs, state.aria, state.dataset], binding.forwardProps),
		}}
		attach={binding.attachElement}
	>
		{#if props.leading}<div class="so-date-input__leading">
				{@render props.leading({ ctrl })}
			</div>{/if}<span class="so-date-input__segments" {...state.segmentsAttrs}
			>{#each state.segments ?? [] as segment (segment.key)}{#if segment.type === 'literal'}<span
						class="so-date-input__literal"
						{...segment.aria}>{segment.text}</span
					>{:else}<TextSpan
						class="so-date-input__segment"
						{...segment.attrs}
						{...segment.aria}
						{...segment.dataset}
						text={segment.text}
					/>{/if}{/each}</span
		>{#if state.clearable || props.clear || props.trailing}<div
				class="so-date-input__trailing"
			>
				{#if props.clear}
					{@render props.clear({ clear: ctrl.clear })}
				{:else if state.clearable}
					<Button
						embedded="date-input.clear"
						type="button"
						class="so-date-input__clear"
						size={state.size}
						disabled={state.disabled}
						{...state.clearAria}
						onActionClick={clear}
					>
						<Icon embedded="date-input.clear-icon" tag={CLOSE} size={state.size} />
					</Button>
				{/if}{#if props.trailing}
					{@render props.trailing({ ctrl })}
				{/if}
			</div>{/if}<input
			type="hidden"
			name={state.name}
			value={state.value ?? ''}
			disabled={state.disabled}
		/>
	</Dynamic>
{/if}
