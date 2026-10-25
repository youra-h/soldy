import type { JSX } from 'solid-js'
import {
	Root,
	chainHandler,
	createRootProps,
	renderSlot,
	resolveSlot,
	roleIcon,
	toControlAttrs,
	toRootForward,
} from '../../../adapter'
import { Show } from '../../../adapter/runtime/flow'
import { ItemRow } from '../../item-row'
import { Frame } from '../../frame'
import { Icon } from '../../icon'
import { setupMenuPopoverItem } from './setup.component'
import type { MenuPopoverItemAttributes, MenuPopoverItemProps } from './base.component'

/** Стрелка без слота — иконка из пакета по роли, компонент на роль один на модуль. */
const ARROW = roleIcon('arrowRight')

/**
 * Пункт с панелью: строка пункта и своя панель сбоку с любым содержимым. Текст
 * строки — слот `header`: `default` — содержимое панели.
 */
export function MenuPopoverItem(props: MenuPopoverItemProps): JSX.Element {
	const binding = setupMenuPopoverItem(props)
	const state = binding.state
	const context = binding.context
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
			<Root tag={state.tag} attributes={root} ref={binding.ref}>
				<ItemRow
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
				</ItemRow>
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
			</Root>
		</Show>
	)
}
