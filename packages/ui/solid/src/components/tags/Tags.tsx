import type { JSX } from 'solid-js'
import { Elevate, ResolvedSlot, createRootProps, relaySlot, renderSlot } from '../../adapter'
import { For, Show } from '../../adapter/runtime/flow'
import { TagsItem } from './item'
import { setupTags } from './setup.component'
import type { TagsProps } from './base.component'

/**
 * Набор тегов: корень — сам ряд с ролью. Слот `default` (scope `shown`) заменяет
 * петлю тегов: каждый тег рисуется один раз.
 */
export function Tags(props: TagsProps): JSX.Element {
	const binding = setupTags(props)
	const state = binding.state
	const root = createRootProps(() => ({
		state,
		sets: [state.attrs, state.aria, state.dataset],
		forward: binding.forwardProps(),
	}))

	return (
		<Show when={state.rendered}>
			<div {...root()} ref={binding.ref}>
				<Elevate layer={binding.layer}>
					<ResolvedSlot
						content={props.children}
						scope={() => ({ shown: state.shown ?? [] })}
						fallback={
							<For each={state.shown}>
								{(item) => (
									<TagsItem
										ctrl={item}
										leading={renderSlot(props['item-leading'], { item })}
										trailing={renderSlot(props['item-trailing'], { item })}
										close-icon={renderSlot(props['item-close-icon'], {
											item,
										})}
									>
										{relaySlot(props.item, { item })}
									</TagsItem>
								)}
							</For>
						}
					/>
				</Elevate>
			</div>
		</Show>
	)
}
