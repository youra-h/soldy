<script lang="ts">
	import { Dynamic, toRootProps } from '../../adapter'
	import { Frame } from '../frame'
	import { setupTooltip } from './setup.component'
	import type { TooltipProps } from './base.component'

	let { ref = $bindable(), ...props }: TooltipProps = $props()
	const mountId = $props.id()

	const binding = setupTooltip(() => props, mountId, (node) => (ref = node))
	const state = binding.state
</script>

<!--
	Tooltip — подсказка у триггера, как у Vue.

	Корень — обёртка триггера, якорь панели и цель наведения. Панель
	телепортирована, поэтому в корне лежит только триггер, и прямоугольник
	корня совпадает с его прямоугольником: курсор на триггере — курсор на
	корне. Рисуется по `tag`, по умолчанию `span`: подсказка встаёт и в строку
	текста, и в ряд кнопок. ARIA на корне нет: она у панели и у триггера.

	Триггер — сниппет `trigger`: элемент потребителя. Фокус остаётся на нём и в
	панель не уходит. Своего экземпляра у содержимого сниппета нет, поэтому
	ссылку на панель — `aria-describedby` или, при `type="label"`,
	`aria-labelledby` — он получает в scope (`triggerAria`).

	Панель — Frame: телепорт, слой, привязка к корню (`anchor_anchor` — корень
	из `rootElement` адаптера) — по умолчанию над триггером по центру, в 6 px от
	него — и пометка владельцем, по которой панель находят плагины. На неё
	ложится `aria` подсказки: `role="tooltip"` и `id`, на который ссылается
	триггер. Панель не фокусируется, кнопки закрытия в ней нет. Открытость —
	`visible` панели: закрытая спрятана, а не размонтирована, и ссылка триггера
	ведёт на неё всегда. Обёртка содержимого держит ширину панели: по тексту, до
	потолка темы.

	Триггер и панель стоят вплотную: пробел между ними Svelte оставил бы в
	корне текстом.
-->
{#if state.rendered}
	<Dynamic
		tag={state.tag}
		attributes={toRootProps(state, [state.attrs, state.dataset], binding.forwardProps)}
		attach={binding.attachElement}
	>
		{@render props.trigger?.({ triggerAria: state.triggerAria ?? {} })}<Frame
			embedded="tooltip.frame"
			class="so-tooltip__panel"
			visible={state.open}
			position="fixed"
			anchor_anchor={binding.rootElement}
			anchor_placement={state.placement}
			anchor_offset={6}
			{...state.aria}
			{...state.dismiss_ownerAttribute}
		>
			<div class="so-tooltip__content">{@render props.children?.()}</div>
		</Frame>
	</Dynamic>
{/if}
