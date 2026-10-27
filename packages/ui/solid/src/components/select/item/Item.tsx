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
import { setupSelectItem } from './setup.component'
import type { SelectItemAttributes, SelectItemProps } from './base.component'

/** Отметка без слота — иконка из пакета по роли, компонент на роль один на модуль. */
const CHECK = roleIcon('check')

/**
 * Опция: строка — `ItemRow` на `span` с наборами `aria` и `dataset` опции
 * (`tabindex="-1"` от `TSelectExtension` — фокус остаётся на поле), выбор — клик по строке, как у
 * ListBox: сначала выбор, затем клик потребителя. Обёртка
 * отметки — и у невыбранной: держит место, и строка не прыгает при выборе.
 */
export function SelectItem(props: SelectItemProps): JSX.Element {
	const binding = setupSelectItem(props)
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
	const row = () => toControlAttrs<SelectItemAttributes>(binding.forwardProps())
	const choose = clickAction(() => context?.adapters.select.choose())

	const mark = () => (
		<span class="so-select-item__indicator" aria-hidden="true">
			{indicatorIcon() ??
				(state.selected ? (
					<Icon embedded="select.indicator" tag={CHECK} size={state.size} />
				) : null)}
		</span>
	)

	return (
		<Show when={state.rendered}>
			<Root tag={state.tag} attributes={root} ref={binding.ref}>
				<ItemRow
					embedded="select.row"
					tag="span"
					size={state.size}
					variant={state.variant}
					disabled={state.disabled}
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
