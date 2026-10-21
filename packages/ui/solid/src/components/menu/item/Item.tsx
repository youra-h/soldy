import { Show, type JSX } from 'solid-js'
import { Dynamic } from 'solid-js/web'
import {
	chainHandler,
	createRootProps,
	renderSlot,
	resolveSlot,
	rootTag,
	toControlAttrs,
	toRootForward,
} from '../../../adapter'
import { Button } from '../../button'
import { setupMenuItem } from './setup.component'
import type { MenuItemAttributes, MenuItemProps } from './base.component'

/**
 * MenuItem — пункт-действие: корень по `tag` (по умолчанию `div`) и строка
 * внутри — `Button` на `div`, как у Vue. Строку флажок и переключатель рисуют
 * свою: у них отметка в начале строки и другое нажатие.
 *
 * Корень несёт состояние для темы (`dataset`: `data-highlighted`,
 * `data-disabled`), `attrs` и модификаторы размера меню и своего варианта, а
 * строка красится от него: носитель `dataset` один. На строке — ARIA пункта
 * (роль `menuitem`, `tabindex="-1"` от меню) и DOM-фокус, когда пункт
 * подсвечен. Размер и `disabled` — пункта; вида и варианта строка не
 * получает: вид ей даёт тема по контексту, а цвет она берёт с пункта и панели.
 * Атрибуты потребителя делятся, как у Vue: класс и стиль — корню, остальное —
 * строке, поверх её `aria`.
 *
 * Нажатие — клик строки: Enter и пробел на ней превращает в клик сама строка
 * (`TActionPlugin`), и путь у мыши и клавиатуры один. Решает меню
 * (`adapters.menu.choose()`): выключенному пункту оно отказывает, а доступный
 * выполняет и закрывается. Клик потребителя приходит после — как у Vue, где
 * слушатели складываются (`chainHandler`).
 *
 * Значок — слот `leading` в обёртке колонки, подсказка сочетания клавиш —
 * `trailing` в обёртке у конца строки. Обёртки есть у каждого пункта, и
 * пробелов в них нет: пустую тема прячет по `:empty`. По слоту `default`
 * разметка выбирает, что рисовать, поэтому его разворачивает адаптер, один раз
 * (`resolveSlot`): пустое, что вернул проброс меню, уступает место тексту.
 */
export function MenuItem(props: MenuItemProps): JSX.Element {
	const binding = setupMenuItem(props)
	const state = binding.state
	const context = binding.context
	// Корню — его наборы, класс и стиль потребителя; `ref` адаптера последним
	const root = createRootProps(() => ({
		state,
		sets: [state.dataset, state.attrs],
		forward: toRootForward(binding.forwardProps()),
	}))
	const content = resolveSlot(
		() => props.children,
		() => ({ text: state.text ?? '' }),
	)

	/** Атрибуты строки — всё от потребителя, кроме класса и стиля; клик — сначала нажатие пункта. */
	const row = () => {
		const { onClick, ...attributes } = toControlAttrs<MenuItemAttributes>(
			binding.forwardProps(),
		)

		return {
			...attributes,
			onClick: chainHandler(() => context?.adapters.menu.choose(), onClick),
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
						<span class="so-menu-item__shortcut">{renderSlot(props.trailing)}</span>
					}
				>
					{content() ?? state.text}
				</Button>
			</Dynamic>
		</Show>
	)
}
