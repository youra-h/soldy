<script lang="ts">
	import { Dynamic, toRootProps } from '../../../adapter'
	import { setupCalendarItem } from './setup.component'
	import type { CalendarItemProps } from './base.component'

	let { ref = $bindable(), ...props }: CalendarItemProps = $props()
	const mountId = $props.id()

	const binding = setupCalendarItem(() => props, mountId, (node) => (ref = node))
	const state = binding.state
</script>

<!--
	CalendarItem — день календаря, `Calendar.Item`, как у Vue. Корень — сама
	ячейка сетки, рисуется по `tag` (по умолчанию `td`): по APG (Date Picker
	Dialog) фокус стоит на ячейке, и на ней же наборы — `attrs`, `aria` (имя —
	полная дата, `aria-selected`, `aria-current`, `aria-disabled`, `tabindex`
	остановки Tab) и `dataset` (отметки выбора, «сегодня», «недоступен»,
	«выключен»), поверх — атрибуты потребителя. Кнопки внутри ячейки нет: фокус
	на ней развёл бы ячейку и то, что фокусируют. Нажатия и клавиши ловят
	плагины календаря на его корне, обработчиков здесь нет.

	Полосу диапазона тема рисует псевдоэлементом ячейки — своего узла у неё нет.

	Плитка дня (`so-calendar-item__day`) — то, что видно выбранным: заливка,
	наведение, кольцо фокуса, рамка «сегодня»; `div`, а не `span`: в слот кладут
	и блочное содержимое. В ней — сниппет `children` со scope `{ text }` (номер
	дня в цифрах локали), без него — сам номер. Календарь отдаёт дню проброс
	своего слота `item`, только когда слот задан ему: сниппет непрозрачен, и
	пустой проброс номера не уступил бы.
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
		<div class="so-calendar-item__day">
			{#if props.children}{@render props.children({ text: state.text ?? '' })}{:else}{state.text}{/if}
		</div>
	</Dynamic>
{/if}
