import type { JSX } from 'solid-js'
import { Dynamic } from 'solid-js/web'
import {
	createRootProps,
	liveScope,
	renderSlot,
	resolveSlot,
	roleIcon,
	rootTag,
} from '../../adapter'
import { Show } from '../../adapter/runtime/flow'
import { Button } from '../button'
import { Frame } from '../frame'
import { Icon } from '../icon'
import { setupPopover } from './setup.component'
import type { PopoverProps } from './base.component'

/**
 * Иконка кнопки закрытия по умолчанию. Компонент на роль — один на модуль:
 * `tag` у Icon — корень, а не роль.
 */
const CLOSE = roleIcon('close')

/**
 * Popover — панель с произвольным содержимым у триггера.
 *
 * Корень — обёртка триггера и якорь панели. Рисуется по `tag`, по умолчанию
 * `span`: Popover встаёт и в строку текста, и в ряд тегов, а внутри строчного
 * элемента HTML разрешает только строчную разметку. Панель телепортирована,
 * поэтому в корне лежит только триггер, и прямоугольник корня совпадает с его
 * прямоугольником. На корне — наборы `attrs` и `dataset` (`data-open` — для
 * темы и для потребителя, который красит свой триггер по контексту), поверх —
 * атрибуты потребителя, `ref` адаптера последним. ARIA на корне нет: она у
 * панели и у триггера.
 *
 * Триггер — содержимое потребителя, например кнопка «…» у Tags. Лежит внутри
 * корня, поэтому нажатие по открытому триггеру — нажатие внутри владельца, и
 * панель не мигает. Своего экземпляра у содержимого слота нет, поэтому сторону
 * связки (`aria-haspopup`, `aria-expanded`, `aria-controls`) и вид «нажат»
 * (`data-selected`) он получает через scope — двумя наборами, ARIA и `data-*`
 * врозь. Связка меняется на каждое открытие, а триггер обязан остаться тем же
 * узлом: на нём фокус, и на него же его возвращает закрытие. Поэтому scope
 * живой (`liveScope`): функция слота зовётся один раз, а прочитанное в её
 * разметке — `<Button {...scope.triggerAria} />` — обновляется на месте.
 *
 * Панель — Frame: телепорт, слой, привязка к корню, пометка владельцем. На неё
 * ложится `aria` поповера: `role="dialog"`, `id`, на который ссылается
 * `aria-controls` триггера, и имя от `TAriaPlugin`. `tabindex="-1"` — фокус
 * встаёт на саму панель, когда внутри нечего фокусировать. Якорь — корень,
 * его узел отдаёт аксессор адаптера (`rootElement`), как `rootElement` у Vue.
 *
 * Открытость — это `visible` панели, а не `rendered`: закрытие её прячет, а не
 * размонтирует. Сторону у края окна выбирает `TAnchorPlugin` поверх
 * `placement`. `contained` оставляет панель в корне, без телепорта: она прижата
 * к краю (`edge`) ближайшего позиционированного предка, и якорь её не двигает.
 *
 * `panelDataset` — `data-*` панели от поповера: признак «тянут»
 * (`data-swiping`), по которому тема снимает переход, пока панель идёт за
 * пальцем, а у панели в контейнере — её край (`data-edge`). Открытость
 * (`data-open`), по которой тема проявляет и гасит панель переходом, Frame
 * пишет сам: это видимость его слоя, а `data-open` корня до телепортированной
 * панели не доходит. Сдвиг во время жеста (`--so-swipe-offset`) плагин жеста
 * пишет в панель сам.
 *
 * Логики здесь нет: клик по триггеру, нажатие и фокус мимо, фокус, Escape, Tab
 * и жест ведут плагины (см. `setupPopover`). Разметка раскладывает то, что
 * отдали ядро и плагины; кнопка закрытия только ставит `open = false`, а куда
 * вернуть фокус, решает плагин фокуса.
 */
export function Popover(props: PopoverProps): JSX.Element {
	const binding = setupPopover(props)
	const state = binding.state
	const ctrl = binding.ctrl
	// Наборы ядра, поверх — атрибуты снаружи, `ref` адаптера последним
	const root = createRootProps(() => ({
		state,
		sets: [state.attrs, state.dataset],
		forward: binding.forwardProps(),
	}))
	const trigger = liveScope(() => ({
		triggerAria: state.triggerAria ?? {},
		triggerDataset: state.triggerDataset ?? {},
	}))
	const closeIcon = resolveSlot(
		() => props['close-icon'],
		() => ({}),
	)

	/** Кнопка закрытия только закрывает поповер: возврат фокуса — забота плагина. */
	const close = (): void => {
		ctrl.open = false
	}

	return (
		<Show when={state.rendered}>
			<Dynamic {...root()} component={rootTag(state.tag)} ref={binding.ref}>
				{renderSlot(props.trigger, trigger)}
				<Frame
					embedded="popover.frame"
					class="so-popover__panel"
					tabindex="-1"
					visible={state.open}
					contained={state.contained}
					position="fixed"
					anchor_anchor={binding.rootElement()}
					anchor_placement={state.placement}
					anchor_offset={8}
					{...state.aria}
					{...state.panelDataset}
					{...state.dismiss_ownerAttribute}
				>
					{/*
						Полоса, за которую панель тянут, — пока жест включён. Она
						говорит, что панель можно смахнуть, и сама ничего не делает:
						потребитель её не адресует, скринридеру она не нужна
						(`aria-hidden`). Стоит она там, откуда панель тянут: у панели у
						триггера — у края со стороны триггера (`data-placement`), у
						панели в контейнере — у края, противоположного её краю
						(`data-edge`). Ставит её тема. Закрыть без перетаскивания —
						Escape, нажатие мимо и крестик.
					*/}
					<Show when={state.handleRendered}>
						<div class="so-popover__handle" aria-hidden="true" />
					</Show>
					{/*
						Содержимое в DOM раньше кнопки закрытия — в том же порядке, в
						каком читается верхний ряд панели: текст от начала строки,
						крестик в её конце. Поэтому фокус при открытии встаёт на первый
						фокусируемый элемент содержимого, а крестик — последняя
						остановка Tab в панели.

						`lazyMount` действует только на слот: обёртка остаётся, панель
						не размонтируется никогда.
					*/}
					<div class="so-popover__content">
						<Show when={state.contentRendered}>{renderSlot(props.children)}</Show>
					</div>
					{/*
						Кнопка закрытия — в верхнем углу со стороны конца строки. Вида у
						неё нет: значения вида объявляет тема, и красит кнопку она по
						контексту (`.so-popover__close`). `size` не передаётся: тема
						держит квадрат по размеру Button. Значок — слот `close-icon`,
						по умолчанию — иконка роли `close`; по слоту разметка выбирает,
						что рисовать, поэтому его разворачивает адаптер, один раз
						(`resolveSlot`).
					*/}
					<Button
						embedded="popover.close"
						type="button"
						class="so-popover__close"
						rendered={state.closable}
						onClick={close}
						{...state.closeAria}
					>
						{closeIcon() ?? <Icon embedded="popover.close-icon" tag={CLOSE} />}
					</Button>
				</Frame>
			</Dynamic>
		</Show>
	)
}
