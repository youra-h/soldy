import type { JSX } from 'solid-js'
import {
	Elevate,
	ResolvedSlot,
	createPartProps,
	createRootProps,
	relaySlot,
	renderSlot,
	toControlAttrs,
	toRootForward,
} from '../../adapter'
import { For, Show } from '../../adapter/runtime/flow'
import { TabsItem } from './item'
import { setupTabs } from './setup.component'
import type { TabsAttributes, TabsProps } from './base.component'

/**
 * Набор табов: список (`so-tabs__list`) с набором `aria` и атрибутами потребителя и
 * панели — слот `content` вне списка, иначе панель оказалась бы в `[role=tablist]`.
 * Тема рисует вид от корня дочерними комбинаторами: список и панели — дети корня.
 */
export function Tabs(props: TabsProps): JSX.Element {
	const binding = setupTabs(props)
	const state = binding.state
	const root = createRootProps(() => ({
		state,
		sets: [state.attrs, state.dataset],
		forward: toRootForward(binding.forwardProps()),
	}))
	const aria = createPartProps(() => state.aria)
	const control = createPartProps(() => toControlAttrs<TabsAttributes>(binding.forwardProps()))

	return (
		<Show when={state.rendered}>
			<div {...root()} ref={binding.ref}>
				<Elevate layer={binding.layer}>
					<div class="so-tabs__list" {...aria()} {...control()}>
						<ResolvedSlot content={props.leading}>
							{(leading) => <div class="so-tabs__list--leading">{leading()}</div>}
						</ResolvedSlot>
						<ResolvedSlot
							content={props.children}
							fallback={
								<For each={state.shown}>
									{(item) => (
										<TabsItem
											ctrl={item}
											leading={renderSlot(props['item-leading'], { item })}
											trailing={renderSlot(props['item-trailing'], { item })}
											close-icon={renderSlot(props['item-close-icon'], {
												item,
											})}
										>
											{relaySlot(props.item, { item })}
										</TabsItem>
									)}
								</For>
							}
						/>
						<ResolvedSlot content={props.trailing}>
							{(trailing) => <div class="so-tabs__list--trailing">{trailing()}</div>}
						</ResolvedSlot>
					</div>
					{renderSlot(props.content)}
				</Elevate>
			</div>
		</Show>
	)
}
