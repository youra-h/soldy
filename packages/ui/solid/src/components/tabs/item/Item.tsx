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
import { setupTabsItem } from './setup.component'
import type { TabsItemAttributes, TabsItemProps } from './base.component'

/** Глиф крестика без слота. */
const CLOSE = roleIcon('close')

/**
 * Таб: строка — Button с `role="tab"` и набором `aria`, крестик — её сосед: интерактивный
 * потомок у `role="tab"` HTML запрещает. Крестик — `Show`, а не `rendered` кнопки:
 * тело выполняется сразу, и скрытая кнопка собирала бы у каждого таба свой контекст.
 */
export function TabsItem(props: TabsItemProps): JSX.Element {
	const binding = setupTabsItem(props)
	const state = binding.state
	const context = binding.context
	const root = createRootProps(() => ({
		state,
		sets: [state.dataset, state.attrs],
		forward: toRootForward(binding.forwardProps()),
	}))
	const content = resolveSlot(
		() => props.children,
		() => ({ text: state.text ?? '', active: state.active ?? false }),
	)
	const closeIcon = resolveSlot(
		() => props['close-icon'],
		() => ({}),
	)

	/** Атрибуты строки — всё от потребителя, кроме класса и стиля; клик — сначала активация. */
	const row = () => {
		const { onClick, ...attributes } = toControlAttrs<TabsItemAttributes>(
			binding.forwardProps(),
		)
		const activate = () => {
			if (context) context.adapters.activation.active = true
		}

		return { ...attributes, onClick: chainHandler(activate, onClick) }
	}

	// Крестик — `onActionClick` со `stopPropagation`: `onClick` Solid делегирует документу,
	// и гасить там поздно — корни таба и набора уже отдали бы `action:press`
	function close(event: MouseEvent): void {
		event.stopPropagation()
		context?.adapters.tabs.close()
	}

	return (
		<Show when={state.rendered}>
			<Dynamic {...root()} component={rootTag(state.tag)} ref={binding.ref}>
				<Button
					embedded="tabs.row"
					type="button"
					disabled={state.disabled}
					size={state.size}
					variant={state.variant}
					leading={renderSlot(props.leading)}
					trailing={renderSlot(props.trailing)}
					{...state.aria}
					{...row()}
				>
					{content() ?? state.text}
				</Button>
				<Show when={state.tab_closable === true}>
					<Button
						embedded="tabs.close"
						type="button"
						class="so-tabs-item__close"
						disabled={state.disabled}
						size={state.size}
						{...state.closeAria}
						onActionClick={close}
					>
						{closeIcon() ?? (
							<Icon embedded="tabs.close-icon" tag={CLOSE} size={state.size} />
						)}
					</Button>
				</Show>
			</Dynamic>
		</Show>
	)
}
