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
 * Пункт с панелью: строка пункта и своя панель сбоку с любым содержимым. Текст
 * строки — слот `header`: `default` — содержимое панели. Строка — `Button` над
 * экземпляром пункта (`row`, `TItemRow` на `div`), как у пункта-действия.
 */
export function MenuPopoverItem(props: MenuPopoverItemProps): JSX.Element {
	const binding = setupMenuPopoverItem(props)
	const state = binding.state
	const context = binding.context
	const row = binding.row
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
	const rowAttrs = () => {
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
					ctrl={row}
					{...state.aria}
					{...rowAttrs()}
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
