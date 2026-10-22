import type { JSX } from 'solid-js'
import { Dynamic } from 'solid-js/web'
import {
	chainHandler,
	createRootProps,
	renderSlot,
	resolveSlot,
	roleIcon,
	rootTag,
	toControlAttrs,
	toRootForward,
} from '../../../adapter'
import { Show } from '../../../adapter/runtime/flow'
import { Button } from '../../button'
import { Frame } from '../../frame'
import { Icon } from '../../icon'
import { setupMenuPopoverItem } from './setup.component'
import type { MenuPopoverItemAttributes, MenuPopoverItemProps } from './base.component'

/** Стрелка без слота — иконка из пакета по роли, компонент на роль один на модуль. */
const ARROW = roleIcon('arrowRight')

/**
 * MenuPopoverItem — пункт с панелью: строка пункта в меню и своя панель сбоку
 * с любым содержимым — календарём, полями, палитрой, как `Menu.PopoverItem`
 * у Vue.
 *
 * Корень — блок пункта, общий с действием и флажком: на нём модификаторы
 * размера меню и своего варианта и состояние для темы — `data-highlighted`,
 * `data-disabled` и `data-open` (панель открыта). Строка красится от него,
 * носитель `dataset` один. Панель телепортирована, поэтому прямоугольник
 * корня — прямоугольник строки, и корень служит панели якорем: его узел
 * отдаёт аксессор адаптера (`rootElement`). Атрибуты потребителя делятся, как
 * у пункта: класс и стиль — корню, остальное — строке.
 *
 * Строка — `Button` на `div` (`menu.row`): на ней ARIA пункта — роль
 * `menuitem`, `aria-haspopup="dialog"`, `aria-expanded`, `id` и
 * `aria-controls` на панель, `tabindex="-1"` от меню — и DOM-фокус, когда
 * пункт подсвечен. Нажатие строки открывает панель, а не выполняет действие:
 * меню остаётся открытым, а открытую панель повторное нажатие не закрывает.
 * Решает меню (`adapters.menu.open()`): выключенному отказывает. Enter и
 * пробел на строке превращает в клик сама строка (`TActionPlugin`), стрелку к
 * концу строки клавиатура пункта гасит и открывает панель сама.
 *
 * Текст строки — слот `header`, а не `default`: `default` — содержимое панели,
 * как у `Accordion.Item` и `Popover`. Scope — `text` и `open`, без слота —
 * текст пункта. Стрелка — у конца строки, в обёртке: тема зеркалит её в RTL
 * по `.so-menu-item__arrow`, и иконка, подменённая слотом `arrow-icon`,
 * зеркалится так же; обёртка скрыта от скринридера — о панели говорит ARIA
 * строки. Подсказки сочетания у этого пункта нет.
 *
 * Панель — Frame: телепорт в `body`, соседка панели меню, а не её потомок,
 * слой поверх неё (нажатие и фокус в ней меню мимо не считает), привязка к
 * корню пункта и пометка владельцем. Встаёт у самого конца строки, верхом
 * вровень с ней, без зазора (`end-start`). На неё ложится её набор ARIA
 * (`panelAria`): `role="dialog"`, `id` и `aria-labelledby` на строку — имя
 * панели. Модификаторов размера и варианта у неё нет: содержимое красится
 * само. Открытость — `visible` панели, а не `rendered`; `lazyMount` действует
 * только на содержимое — обёртка остаётся, панель не размонтируется никогда.
 */
export function MenuPopoverItem(props: MenuPopoverItemProps): JSX.Element {
	const binding = setupMenuPopoverItem(props)
	const state = binding.state
	const context = binding.context
	// Корню — его наборы, класс и стиль потребителя; `ref` адаптера последним
	const root = createRootProps(() => ({
		state,
		sets: [state.dataset, state.attrs],
		forward: toRootForward(binding.forwardProps()),
	}))
	const header = resolveSlot(
		() => props.header,
		() => ({ text: state.text ?? '', open: state.open ?? false }),
	)
	const arrowIcon = resolveSlot(
		() => props['arrow-icon'],
		() => ({}),
	)

	/** Атрибуты строки — всё от потребителя, кроме класса и стиля; клик — сначала открытие. */
	const row = () => {
		const { onClick, ...attributes } = toControlAttrs<MenuPopoverItemAttributes>(
			binding.forwardProps(),
		)

		return {
			...attributes,
			onClick: chainHandler(() => context?.adapters.menu.open(), onClick),
		}
	}

	return (
		<Show when={state.rendered}>
			<Dynamic {...root()} component={rootTag(state.tag)} ref={binding.ref}>
				<Button
					embedded="menu.row"
					tag="div"
					size={state.size}
					disabled={state.disabled}
					{...state.aria}
					{...row()}
					leading={<span class="so-menu-item__icon">{renderSlot(props.leading)}</span>}
					trailing={
						<span class="so-menu-item__arrow" aria-hidden="true">
							{arrowIcon() ?? (
								<Icon embedded="menu.arrow" tag={ARROW} size={state.size} />
							)}
						</span>
					}
				>
					{header() ?? state.text}
				</Button>
				<Frame
					embedded="menu.popover-item-frame"
					class="so-menu-item__panel"
					tabindex="-1"
					visible={state.open}
					position="fixed"
					anchor_anchor={binding.rootElement()}
					anchor_placement="end-start"
					{...state.panelAria}
					{...state.dismiss_ownerAttribute}
				>
					<div class="so-menu-item__content">
						<Show when={state.contentRendered}>{renderSlot(props.children)}</Show>
					</div>
				</Frame>
			</Dynamic>
		</Show>
	)
}
