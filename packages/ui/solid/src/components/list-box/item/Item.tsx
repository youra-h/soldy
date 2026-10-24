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
import { setupListBoxItem } from './setup.component'
import type { ListBoxItemAttributes, ListBoxItemProps } from './base.component'

/** Отметка без слота — иконка из пакета по роли, компонент на роль один на модуль. */
const CHECK = roleIcon('check')

/**
 * Элемент списка: строка — `Button` над экземпляром элемента (`row`, `TItemRow` на `div`; под
 * этот тег написан `TListBoxItem._ariaTag`), написанное на корне, кроме класса и стиля,
 * получает она. Тег, размер, вариант, выключенность и вид строке пишет элемент, а роль и
 * `tabindex` — его набор `aria`. Клик — `list.choose()` item-адаптера, а не
 * `selection.toggle()`: выключенному откажет список, как клавиатуре.
 */
export function ListBoxItem(props: ListBoxItemProps): JSX.Element {
	const binding = setupListBoxItem(props)
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
		const { onClick, ...attributes } = toControlAttrs<ListBoxItemAttributes>(
			binding.forwardProps(),
		)

		return {
			...attributes,
			onClick: chainHandler(() => context?.adapters.list.choose(), onClick),
		}
	}

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
			<Dynamic {...root()} component={rootTag(state.tag)} ref={binding.ref}>
				<Button
					embedded="list-box.row"
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
