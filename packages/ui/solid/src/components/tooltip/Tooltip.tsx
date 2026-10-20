import { Show, type JSX } from 'solid-js'
import { Dynamic } from 'solid-js/web'
import { createRootProps, liveScope, renderSlot, rootTag } from '../../adapter'
import { Frame } from '../frame'
import { setupTooltip } from './setup.component'
import type { TooltipProps } from './base.component'

/**
 * Tooltip — подсказка у триггера.
 *
 * Корень — обёртка триггера, якорь панели и цель наведения. Панель
 * телепортирована, поэтому в корне лежит только триггер, и прямоугольник
 * корня совпадает с его прямоугольником: курсор на триггере — курсор на
 * корне. Рисуется по `tag`, по умолчанию `span`: подсказка встаёт и в строку
 * текста, и в ряд кнопок. На корне — наборы `attrs` и `dataset`, поверх —
 * атрибуты потребителя, `ref` адаптера последним. ARIA на корне нет: она у
 * панели и у триггера.
 *
 * Триггер — элемент потребителя. Фокус остаётся на нём и в панель не уходит.
 * Своего экземпляра у содержимого слота нет, поэтому ссылку на панель —
 * `aria-describedby` или, при `type="label"`, `aria-labelledby` — он получает
 * через scope. Ссылка меняется со сменой `type`, а триггер остаётся тем же
 * узлом, с фокусом на нём: scope живой (`liveScope`), и прочитанное в разметке
 * слота — `<Button {...scope.triggerAria} />` — обновляется на месте.
 *
 * Панель — Frame: телепорт, слой, привязка к корню — по умолчанию над
 * триггером по центру, в 6 px от него — и пометка владельцем, по которой
 * панель находят плагины. На неё ложится `aria` подсказки: `role="tooltip"` и
 * `id`, на который ссылается триггер. Панель не фокусируется, кнопки закрытия
 * в ней нет. Якорь — корень, его узел отдаёт аксессор адаптера
 * (`rootElement`), как `rootElement` у Vue.
 *
 * Открытость — `visible` панели: закрытая спрятана, а не размонтирована, и
 * ссылка триггера ведёт на неё всегда. Сторону у края окна выбирает
 * `TAnchorPlugin` поверх `placement`.
 *
 * Логики здесь нет: наведение, фокус, нажатие и Escape ведут плагины (см.
 * `setupTooltip`).
 */
export function Tooltip(props: TooltipProps): JSX.Element {
	const binding = setupTooltip(props)
	const state = binding.state
	// Наборы ядра, поверх — атрибуты снаружи, `ref` адаптера последним
	const root = createRootProps(() => ({
		state,
		sets: [state.attrs, state.dataset],
		forward: binding.forwardProps(),
	}))
	const trigger = liveScope(() => ({ triggerAria: state.triggerAria ?? {} }))

	return (
		<Show when={state.rendered}>
			<Dynamic {...root()} component={rootTag(state.tag)} ref={binding.ref}>
				{renderSlot(props.trigger, trigger)}
				<Frame
					embedded="tooltip.frame"
					class="so-tooltip__panel"
					visible={state.open}
					position="fixed"
					anchor_anchor={binding.rootElement()}
					anchor_placement={state.placement}
					anchor_offset={6}
					{...state.aria}
					{...state.dismiss_ownerAttribute}
				>
					{/*
						Обёртка держит ширину панели: по тексту, до потолка темы, где
						бы у края окна панель ни стояла.
					*/}
					<div class="so-tooltip__content">{renderSlot(props.children)}</div>
				</Frame>
			</Dynamic>
		</Show>
	)
}
