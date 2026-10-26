import type { JSX } from 'solid-js'
import { Root, createRootProps, liveScope, renderSlot, resolveSlot, roleIcon } from '../../adapter'
import { Show } from '../../adapter/runtime/flow'
import { Button } from '../button'
import { Frame } from '../frame'
import { Icon } from '../icon'
import { setupPopover } from './setup.component'
import type { PopoverProps } from './base.component'

/** Иконка кнопки закрытия по умолчанию. */
const CLOSE = roleIcon('close')

/**
 * Панель у триггера: корень — обёртка триггера и якорь панели, панель — Frame.
 * Связку триггер получает живым scope слота `trigger`.
 */
export function Popover(props: PopoverProps): JSX.Element {
	const binding = setupPopover(props)
	const state = binding.state
	const ctrl = binding.ctrl
	const root = createRootProps(() => ({
		state,
		sets: [state.attrs, state.dataset],
		forward: binding.forwardProps(),
	}))
	const trigger = liveScope(() => ({
		triggerAria: state.triggerAria ?? {},
		triggerDataset: state.triggerDataset ?? {},
	}))
	const closeIcon = resolveSlot(
		() => props['close-icon'],
		() => ({}),
	)

	/** Кнопка закрытия только закрывает поповер: возврат фокуса — забота плагина. */
	const close = (): void => {
		ctrl.open = false
	}

	return (
		<Show when={state.rendered}>
			<Root tag={state.tag} attributes={root} ref={binding.ref}>
				{renderSlot(props.trigger, trigger)}
				<Frame
					embedded="popover.frame"
					class="so-popover__panel"
					tabindex="-1"
					visible={state.open}
					contained={state.contained}
					position="fixed"
					anchor_anchor={binding.rootElement()}
					anchor_placement={state.placement}
					anchor_offset={8}
					{...state.aria}
					{...state.panelDataset}
					{...state.dismiss_ownerAttribute}
				>
					<Show when={state.handleRendered}>
						<div class="so-popover__handle" aria-hidden="true" />
					</Show>
					{/* Крестик — после содержимого, последней остановкой Tab; `lazyMount` — на слот. */}
					<div class="so-popover__content">
						<Show when={state.contentRendered}>{renderSlot(props.children)}</Show>
					</div>
					<Show when={state.closable}>
						<Button
							embedded="popover.close"
							type="button"
							class="so-popover__close"
							onClick={close}
							{...state.closeAria}
						>
							{closeIcon() ?? <Icon embedded="popover.close-icon" tag={CLOSE} />}
						</Button>
					</Show>
				</Frame>
			</Root>
		</Show>
	)
}
