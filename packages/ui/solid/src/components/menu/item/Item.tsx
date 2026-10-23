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
import { setupMenuItem } from './setup.component'
import type { MenuItemAttributes, MenuItemProps } from './base.component'

/**
 * Пункт-действие: строка — `Button` на `div` с набором `aria`. Обёртки значка и
 * сочетания — у каждого пункта и без пробелов: пустую тема прячет по `:empty`.
 */
export function MenuItem(props: MenuItemProps): JSX.Element {
	const binding = setupMenuItem(props)
	const state = binding.state
	const context = binding.context
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
