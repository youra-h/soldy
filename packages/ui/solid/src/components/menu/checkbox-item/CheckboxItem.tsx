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
import { ItemRow } from '../../item-row'
import { Icon } from '../../icon'
import { setupMenuCheckboxItem } from './setup.component'
import type { MenuCheckboxItemAttributes, MenuCheckboxItemProps } from './base.component'

/** Отметка без слота — иконка из пакета по роли, компонент на роль один на модуль. */
const CHECK = roleIcon('check')

/**
 * Флажок меню: строка пункта с отметкой в начале. Обёртка отметки — и у
 * неотмеченного: по ней тема видит у меню колонку отметок.
 */
export function MenuCheckboxItem(props: MenuCheckboxItemProps): JSX.Element {
	const binding = setupMenuCheckboxItem(props)
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
				</ItemRow>
			</Dynamic>
		</Show>
	)
}
