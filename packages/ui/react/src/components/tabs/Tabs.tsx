import type { ReactElement } from 'react'
import {
	Elevate,
	hasSlot,
	relaySlot,
	renderSlot,
	toAriaProps,
	toControlAttrs,
	toRootForward,
	toRootProps,
} from '../../adapter'
import { TabsItem } from './item'
import { useSetupTabs } from './setup.component'
import type { TabsAttributes, TabsProps } from './base.component'

/**
 * Tabs — набор табов: список `[role=tablist]` и панели рядом с ним (слот
 * `content`). Атрибуты потребителя — списку: AGENTS.md (React), «Корень и `ref` потребителя».
 */
export function Tabs(props: TabsProps): ReactElement | null {
	const { ref, forwardProps, state, layer } = useSetupTabs(props)

	const { rendered, shown, attrs, aria, dataset } = state

	if (!rendered) return null

	return (
		<div {...toRootProps(ref, state, [attrs, dataset], toRootForward(forwardProps))}>
			<Elevate layer={layer}>
				<div
					className="so-tabs__list"
					{...toAriaProps(aria)}
					{...toControlAttrs<TabsAttributes>(forwardProps)}
				>
					{hasSlot(props.leading) ? (
						<div className="so-tabs__list--leading">{renderSlot(props.leading)}</div>
					) : null}
					{hasSlot(props.children)
						? renderSlot(props.children)
						: shown?.map((item) => (
								<TabsItem
									key={item.uid}
									ctrl={item}
									leading={renderSlot(props['item-leading'], { item })}
									trailing={renderSlot(props['item-trailing'], { item })}
									close-icon={renderSlot(props['item-close-icon'], { item })}
								>
									{relaySlot(props.item, { item })}
								</TabsItem>
							))}
					{hasSlot(props.trailing) ? (
						<div className="so-tabs__list--trailing">{renderSlot(props.trailing)}</div>
					) : null}
				</div>
				{renderSlot(props.content)}
			</Elevate>
		</div>
	)
}
