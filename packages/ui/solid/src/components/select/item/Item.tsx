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
import { Icon } from '../../icon'
import { setupSelectItem } from './setup.component'
import type { SelectItemAttributes, SelectItemProps } from './base.component'

/** Отметка без слота — иконка из пакета по роли, компонент на роль один на модуль. */
const CHECK = roleIcon('check')

/**
 * Опция: строка — `Button` над экземпляром опции (`row`, `TItemRow` на `span`) с наборами
 * `aria` и `dataset` опции: тег, размер, вариант и выключенность строке пишет опция, а роль и
 * `tabindex="-1"` — её набор (фокус остаётся на поле). Выбор — клик по строке, как у ListBox:
 * сначала выбор, затем клик потребителя. Обёртка отметки — и у невыбранной: держит место, и
 * строка не прыгает при выборе.
 */
export function SelectItem(props: SelectItemProps): JSX.Element {
	const binding = setupSelectItem(props)
	const state = binding.state
	const context = binding.context
	const row = binding.row
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

	/** Атрибуты строки — всё от потребителя, кроме класса и стиля; клик — сначала выбор. */
	const rowAttrs = () => {
		const { onClick, ...attributes } = toControlAttrs<SelectItemAttributes>(
			binding.forwardProps(),
		)

		return {
			...attributes,
			onClick: chainHandler(() => context?.adapters.select.choose(), onClick),
		}
	}

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
			<Dynamic {...root()} component={rootTag(state.tag)} ref={binding.ref}>
				<Button
					embedded="select.row"
					ctrl={row}
					{...state.aria}
					{...state.dataset}
					{...rowAttrs()}
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
				</Button>
			</Dynamic>
		</Show>
	)
}
