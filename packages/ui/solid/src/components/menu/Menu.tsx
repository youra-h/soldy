import type { JSX } from 'solid-js'
import { Dynamic } from 'solid-js/web'
import {
	Elevate,
	ResolvedSlot,
	createRootProps,
	liveScope,
	renderSlot,
	rootTag,
	toPartClass,
} from '../../adapter'
import { Show } from '../../adapter/runtime/flow'
import { Frame } from '../frame'
import { drawItems } from './submenu/Submenu'
import { setupMenu } from './setup.component'
import type { MenuProps } from './base.component'

/**
 * Меню у кнопки или контекстное: корень — обёртка триггера и якорь панели. Роль
 * `menu` — у панели, а не у списка `so-menu__list`: фокус без подсветки держит
 * панель, и узел с ролью и фокусом должен быть один.
 */
export function Menu(props: MenuProps): JSX.Element {
	const binding = setupMenu(props)
	const state = binding.state
	const root = createRootProps(() => ({
		state,
		sets: [state.attrs, state.dataset],
		forward: binding.forwardProps(),
	}))
	const trigger = liveScope(() => ({
		triggerAria: state.triggerAria ?? {},
		triggerDataset: state.triggerDataset ?? {},
	}))

	return (
		<Show when={state.rendered}>
			<Dynamic {...root()} component={rootTag(state.tag)} ref={binding.ref}>
				<Elevate layer={binding.layer}>
					{renderSlot(props.trigger, trigger)}
					<Frame
						embedded="menu.frame"
						class={toPartClass(state.panelClasses)}
						tabindex="-1"
						visible={state.open}
						position="fixed"
						anchor_anchor={binding.rootElement()}
						anchor_point={state.point}
						anchor_placement={state.placement}
						anchor_offset={4}
						{...state.aria}
						{...state.dismiss_ownerAttribute}
					>
						<div class="so-menu__list">
							<ResolvedSlot
								content={props.children}
								fallback={drawItems(state, props)}
							/>
						</div>
					</Frame>
				</Elevate>
			</Dynamic>
		</Show>
	)
}
