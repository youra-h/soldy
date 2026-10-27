import type { JSX } from 'solid-js'
import {
	Root,
	clickAction,
	createRootProps,
	renderSlot,
	resolveSlot,
	toControlAttrs,
	toRootForward,
} from '../../../adapter'
import { Show } from '../../../adapter/runtime/flow'
import { ItemRow } from '../../item-row'
import { setupMenuItem } from './setup.component'
import type { MenuItemAttributes, MenuItemProps } from './base.component'

/**
 * Пункт-действие: строка — `ItemRow` на `div` с набором `aria`. Обёртки значка и
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

	/** The row's attributes: all of the consumer's but the class and the style. */
	const row = () => toControlAttrs<MenuItemAttributes>(binding.forwardProps())
	const choose = clickAction(() => context?.adapters.menu.choose())

	return (
		<Show when={state.rendered}>
			<Root tag={state.tag} attributes={root} ref={binding.ref}>
				<ItemRow
					embedded="menu.row"
					tag="div"
					size={state.size}
					disabled={state.disabled}
					{...state.aria}
					{...row()}
					ref={choose}
					leading={<span class="so-menu-item__icon">{renderSlot(props.leading)}</span>}
					trailing={
						<span class="so-menu-item__shortcut">{renderSlot(props.trailing)}</span>
					}
				>
					{content() ?? state.text}
				</ItemRow>
			</Root>
		</Show>
	)
}
