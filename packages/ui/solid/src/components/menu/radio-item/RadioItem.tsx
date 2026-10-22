import type { JSX } from 'solid-js'
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
import { Show } from '../../../adapter/runtime/flow'
import { Button } from '../../button'
import { setupMenuRadioItem } from './setup.component'
import type { MenuRadioItemAttributes, MenuRadioItemProps } from './base.component'

/**
 * MenuRadioItem — переключатель меню: строка пункта с отметкой-точкой в
 * начале, как у Vue.
 *
 * Корень несёт состояние для темы (`data-highlighted`, `data-disabled`,
 * `data-selected`) и модификаторы размера меню и своего варианта, а строка
 * красится от него. На строке — ARIA переключателя (роль `menuitemradio`,
 * `aria-checked` и `tabindex="-1"` от меню) и DOM-фокус, когда переключатель
 * подсвечен. Атрибуты потребителя делятся, как у флажка: класс и стиль —
 * корню, остальное — строке.
 *
 * Нажатие — клик строки, из Enter и пробела его делает сама строка. Решает
 * меню (`adapters.menu.check()`): выключенному отказывает, а доступный
 * отмечает — с остальных переключателей группы отметка снимается — и
 * остаётся открытым. Отмеченный нажатием не снимается.
 *
 * Отметка — у неотмеченного переключателя тоже: обёртка держит колонку
 * отметок. Точка внутри — только у отмеченного, её рисует тема, без иконки;
 * слот `indicator-icon` (scope — `selected`) подменяет её. Обёртка скрыта от
 * скринридера: состояние объявляет `aria-checked`.
 */
export function MenuRadioItem(props: MenuRadioItemProps): JSX.Element {
	const binding = setupMenuRadioItem(props)
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
		const { onClick, ...attributes } = toControlAttrs<MenuRadioItemAttributes>(
			binding.forwardProps(),
		)

		return {
			...attributes,
			onClick: chainHandler(() => context?.adapters.menu.check(), onClick),
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
									(state.selected ? <span class="so-menu-item__dot" /> : null)}
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
