import type { ReactElement } from 'react'
import { Elevate, hasSlot, relaySlot, renderSlot, toRootProps } from '../../adapter'
import { TagsItem } from './item'
import { useSetupTags } from './setup.component'
import type { TagsProps } from './base.component'

/**
 * Tags — набор тегов: ряд с ролью, в нём показанные теги (`shown`).
 * docs/agents/patterns.md, «Готовые паттерны» (Tags).
 */
export function Tags(props: TagsProps): ReactElement | null {
	const { ref, forwardProps, state, layer } = useSetupTags(props)

	const { rendered, shown, attrs, aria, dataset } = state

	if (!rendered) return null

	return (
		<div {...toRootProps(ref, state, [attrs, aria, dataset], forwardProps)}>
			<Elevate layer={layer}>
				{hasSlot(props.children)
					? renderSlot(props.children, { shown: shown ?? [] })
					: shown?.map((item) => (
							<TagsItem
								key={item.uid}
								ctrl={item}
								leading={renderSlot(props['item-leading'], { item })}
								trailing={renderSlot(props['item-trailing'], { item })}
								close-icon={renderSlot(props['item-close-icon'], { item })}
							>
								{relaySlot(props.item, { item })}
							</TagsItem>
						))}
			</Elevate>
		</div>
	)
}
