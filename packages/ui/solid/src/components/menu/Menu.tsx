import { Show, type JSX } from 'solid-js'
import { Dynamic } from 'solid-js/web'
import {
	Elevate,
	ResolvedSlot,
	createRootProps,
	liveScope,
	renderSlot,
	rootTag,
	toPartClass,
} from '../../adapter'
import { Frame } from '../frame'
import { drawItems } from './submenu/Submenu'
import { setupMenu } from './setup.component'
import type { MenuProps } from './base.component'

/**
 * Menu — меню действий у кнопки (APG Menu Button) или контекстное меню
 * области, как у Vue.
 *
 * Корень — обёртка триггера и якорь панели, как у Popover. Рисуется по `tag`,
 * по умолчанию `span`: меню встаёт и в строку текста, и в ряд кнопок. Панель
 * телепортирована, поэтому в корне лежит только триггер, и прямоугольник
 * корня — прямоугольник триггера. На корне — `attrs` и `dataset` (`data-open`
 * — для потребителя, который красит свой триггер по контексту), поверх —
 * атрибуты потребителя, `ref` адаптера последним. ARIA на корне нет: она у
 * панели и у триггера.
 *
 * Триггер — кнопка потребителя («…», «Действия») в слоте `trigger`. Лежит
 * внутри корня: нажатие по открытому триггеру — нажатие внутри владельца, и
 * панель не мигает. Своего экземпляра у содержимого слота нет, поэтому
 * сторону связки (`aria-haspopup`, `aria-expanded`, `id`, `aria-controls`) и
 * вид «нажата» (`data-selected`) он получает через scope — двумя наборами,
 * ARIA и `data-*` врозь. Связка меняется на каждое открытие, а триггер обязан
 * остаться тем же узлом: на нём фокус, и на него же его возвращает закрытие.
 * Поэтому scope живой (`liveScope`). У контекстного меню (`openOn:
 * 'contextmenu'`) в слоте — область: строка, файл, картинка, — и связка у неё
 * пуста.
 *
 * Панель — Frame: телепорт, слой, привязка к корню (`TAnchorPlugin`, отступ
 * 4px, как у Select) и пометка владельцем для закрытия по нажатию мимо. На неё
 * ложится `aria` меню: `role="menu"`, `id`, на который ссылается
 * `aria-controls` триггера, и `aria-labelledby` на триггер — имя меню.
 * `tabindex="-1"` — фокус встаёт на саму панель, пока ни один пункт не
 * подсвечен. Якорь — корень, его узел отдаёт аксессор адаптера
 * (`rootElement`); у контекстного меню панель встаёт у точки вызова
 * (`point`): точка главнее корня, пока задана, и выбирает между ними якорь, а
 * не разметка. Открытость — `visible` панели, а не `rendered`: пункты входят
 * в коллекцию при монтировании, и закрытие не должно её вычищать. Классы
 * панели — свой набор меню (`panelClasses`): блок `so-menu__panel` с размером
 * и вариантом меню — модификаторы корня до телепортированной панели не
 * доходят; строкой его раскладывает адаптер (`toPartClass`).
 *
 * Список (`so-menu__list`) — то, что прокручивается. Роль `menu` — у панели, а
 * не у него: фокус без подсветки держит панель, и узел с ролью и фокусом
 * должен быть один. Пункты — содержимое (`<Menu.Item>` и соседи), а без него
 * — пункты из данных (`items`) по секциям показанных (`drawItems`, одна
 * разметка с подменю).
 *
 * Всё содержимое корня — в слое лифта меню (`Elevate`), как у ListBox: пункт,
 * смонтированный в панели, прочтёт движок и регистратор меню и при своей
 * сборке войдёт в его коллекцию. Содержимое разворачивается там же
 * (`ResolvedSlot`), а не в теле меню: узлы пунктов Solid создал бы там, где
 * развернули слот, — вне его слоя. Пункты стоят в панели, внутри телепорта
 * Frame: собираются они, когда портал впервые читает содержимое, — на
 * сервере, где портала нет, панели и пунктов нет, как у Popover.
 *
 * Логики здесь нет — см. `setupMenu`.
 */
export function Menu(props: MenuProps): JSX.Element {
	const binding = setupMenu(props)
	const state = binding.state
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

	return (
		<Show when={state.rendered}>
			<Dynamic {...root()} component={rootTag(state.tag)} ref={binding.ref}>
				<Elevate layer={binding.layer}>
					{renderSlot(props.trigger, trigger)}
					<Frame
						embedded="menu.frame"
						class={toPartClass(state.panelClasses)}
						tabindex="-1"
						visible={state.open}
						position="fixed"
						anchor_anchor={binding.rootElement()}
						anchor_point={state.point}
						anchor_placement={state.placement}
						anchor_offset={4}
						{...state.aria}
						{...state.dismiss_ownerAttribute}
					>
						<div class="so-menu__list">
							<ResolvedSlot
								content={props.children}
								fallback={drawItems(state, props)}
							/>
						</div>
					</Frame>
				</Elevate>
			</Dynamic>
		</Show>
	)
}
