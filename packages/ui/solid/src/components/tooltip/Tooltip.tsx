import type { JSX } from 'solid-js'
import { Root, createRootProps, liveScope, renderSlot } from '../../adapter'
import { Show } from '../../adapter/runtime/flow'
import { Frame } from '../frame'
import { setupTooltip } from './setup.component'
import type { TooltipProps } from './base.component'

/** Подсказка у триггера: корень — обёртка триггера, якорь панели и цель наведения. */
export function Tooltip(props: TooltipProps): JSX.Element {
	const binding = setupTooltip(props)
	const state = binding.state
	const root = createRootProps(() => ({
		state,
		sets: [state.attrs, state.dataset],
		forward: binding.forwardProps(),
	}))
	const trigger = liveScope(() => ({ triggerAria: state.triggerAria ?? {} }))

	return (
		<Show when={state.rendered}>
			<Root tag={state.tag} attributes={root} ref={binding.ref}>
				{renderSlot(props.trigger, trigger)}
				<Frame
					embedded="tooltip.frame"
					class="so-tooltip__panel"
					visible={state.open}
					position="fixed"
					anchor_anchor={binding.rootElement()}
					anchor_placement={state.placement}
					anchor_offset={6}
					{...state.aria}
					{...state.dismiss_ownerAttribute}
				>
					{/* Обёртка держит ширину панели: по тексту, до потолка темы. */}
					<div class="so-tooltip__content">{renderSlot(props.children)}</div>
				</Frame>
			</Root>
		</Show>
	)
}
