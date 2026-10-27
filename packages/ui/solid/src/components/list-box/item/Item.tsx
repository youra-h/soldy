import type { JSX } from 'solid-js'
import {
	Root,
	clickAction,
	createRootProps,
	renderSlot,
	resolveSlot,
	roleIcon,
	toControlAttrs,
	toRootForward,
} from '../../../adapter'
import { Show } from '../../../adapter/runtime/flow'
import { ItemRow } from '../../item-row'
import { Icon } from '../../icon'
import { setupListBoxItem } from './setup.component'
import type { ListBoxItemAttributes, ListBoxItemProps } from './base.component'

/** Отметка без слота — иконка из пакета по роли, компонент на роль один на модуль. */
const CHECK = roleIcon('check')

/**
 * Элемент списка: строка — `ItemRow` на `div` (под этот тег написан `TListBoxItem._ariaTag`),
 * написанное на корне, кроме класса и стиля, получает она. Клик — `list.choose()`
 * item-адаптера, а не `selection.toggle()`: выключенному откажет список, как клавиатуре.
 */
export function ListBoxItem(props: ListBoxItemProps): JSX.Element {
	const binding = setupListBoxItem(props)
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

	/** The row's attributes: all of the consumer's but the class and the style. */
	const row = () => toControlAttrs<ListBoxItemAttributes>(binding.forwardProps())
	const choose = clickAction(() => context?.adapters.list.choose())

	/** Обёртка отметки — и у невыбранных: она резервирует место. */
	const mark = () => (
		<span class="so-list-box-item__indicator" aria-hidden="true">
			{indicatorIcon() ??
				(state.selected ? (
					<Icon embedded="list-box.indicator" tag={CHECK} size={state.size} />
				) : null)}
		</span>
	)

	return (
		<Show when={state.rendered}>
			<Root tag={state.tag} attributes={root} ref={binding.ref}>
				<ItemRow
					embedded="list-box.row"
					tag="div"
					view={state.view}
					disabled={state.disabled}
					size={state.size}
					variant={state.variant}
					{...state.aria}
					{...state.dataset}
					{...row()}
					ref={choose}
					leading={
						<>
							{state.indicator === 'start' ? mark() : null}
							{renderSlot(props.leading)}
						</>
					}
					trailing={
						<>
							{renderSlot(props.trailing)}
							{state.indicator === 'end' ? mark() : null}
						</>
					}
				>
					{content() ?? state.text}
				</ItemRow>
			</Root>
		</Show>
	)
}
