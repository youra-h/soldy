import type { JSX } from 'solid-js'
import {
	Root,
	chainHandler,
	createRootProps,
	renderSlot,
	resolveSlot,
	toControlAttrs,
	toRootForward,
} from '../../../adapter'
import { Show } from '../../../adapter/runtime/flow'
import { ItemRow } from '../../item-row'
import { setupMenuRadioItem } from './setup.component'
import type { MenuRadioItemAttributes, MenuRadioItemProps } from './base.component'

/** Переключатель меню: строка пункта с отметкой в начале; точку отмеченного рисует тема. */
export function MenuRadioItem(props: MenuRadioItemProps): JSX.Element {
	const binding = setupMenuRadioItem(props)
	const state = binding.state
	const context = binding.context
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
			<Root tag={state.tag} attributes={root} ref={binding.ref}>
				<ItemRow
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
				</ItemRow>
			</Root>
		</Show>
	)
}
