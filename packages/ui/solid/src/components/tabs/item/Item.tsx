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

	/** The row's attributes: all of the consumer's but the class and the style. */
	const row = () => toControlAttrs<TabsItemAttributes>(binding.forwardProps())
	const activate = clickAction(() => {
		if (context) context.adapters.activation.active = true
	})
	// Stopped at the cross: the roots of the tab and the set would give `action:press`
	const close = clickAction((event) => {
		event.stopPropagation()
		context?.adapters.tabs.close()
	})

	return (
		<Show when={state.rendered}>
			<Root tag={state.tag} attributes={root} ref={binding.ref}>
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
					ref={activate}
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
						ref={close}
					>
						{closeIcon() ?? (
							<Icon embedded="tabs.close-icon" tag={CLOSE} size={state.size} />
						)}
					</Button>
				</Show>
			</Root>
		</Show>
	)
}
