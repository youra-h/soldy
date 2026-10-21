import { Show, type JSX } from 'solid-js'
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
import { Button } from '../../button'
import { Icon } from '../../icon'
import { setupMenuCheckboxItem } from './setup.component'
import type { MenuCheckboxItemAttributes, MenuCheckboxItemProps } from './base.component'

/** Отметка без слота — иконка из пакета по роли, компонент на роль один на модуль. */
const CHECK = roleIcon('check')

/**
 * MenuCheckboxItem — флажок меню: строка пункта с отметкой в начале, как у
 * Vue.
 *
 * Корень несёт состояние для темы (`data-highlighted`, `data-disabled`,
 * `data-selected`) и модификаторы размера меню и своего варианта, а строка
 * красится от него: носитель `dataset` один. На строке — ARIA флажка (роль
 * `menuitemcheckbox`, `aria-checked` и `tabindex="-1"` от меню) и DOM-фокус,
 * когда флажок подсвечен. Атрибуты потребителя делятся, как у пункта: класс и
 * стиль — корню, остальное — строке.
 *
 * Нажатие — клик строки, из Enter и пробела его делает сама строка. Решает
 * меню (`adapters.menu.toggle()`): выключенному отказывает, а доступному
 * переключает отметку — выбор коллекции — и остаётся открытым.
 *
 * Отметка — у неотмеченного флажка тоже: обёртка держит колонку, а её наличие
 * в списке тема читает как «у меню есть колонка отметок». Рисунок внутри —
 * только у отмеченного, слот `indicator-icon` (scope — `selected`) подменяет
 * его. Обёртка скрыта от скринридера: состояние объявляет `aria-checked`. По
 * слотам отметки и текста разметка выбирает, что рисовать, поэтому их
 * разворачивает адаптер, один раз (`resolveSlot`).
 */
export function MenuCheckboxItem(props: MenuCheckboxItemProps): JSX.Element {
	const binding = setupMenuCheckboxItem(props)
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
		() => ({ text: state.text ?? '', selected: state.selected ?? false }),
	)
	const indicatorIcon = resolveSlot(
		() => props['indicator-icon'],
		() => ({ selected: state.selected ?? false }),
	)

	/** Атрибуты строки — всё от потребителя, кроме класса и стиля; клик — сначала отметка. */
	const row = () => {
		const { onClick, ...attributes } = toControlAttrs<MenuCheckboxItemAttributes>(
			binding.forwardProps(),
		)

		return {
			...attributes,
			onClick: chainHandler(() => context?.adapters.menu.toggle(), onClick),
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
					leading={
						<>
							<span class="so-menu-item__indicator" aria-hidden="true">
								{indicatorIcon() ??
									(state.selected ? (
										<Icon
											embedded="menu.indicator"
											tag={CHECK}
											size={state.size}
										/>
									) : null)}
							</span>
							<span class="so-menu-item__icon">{renderSlot(props.leading)}</span>
						</>
					}
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
