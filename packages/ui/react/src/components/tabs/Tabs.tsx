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
 * Tabs — набор табов: ряд со списком `[role=tablist]` и панели рядом с ним
 * (слот `content`). Слоты `leading` и `trailing` — в ряду по краям списка, а
 * не в нём: в `tablist` ARIA пускает только `tab`. Атрибуты потребителя —
 * списку: AGENTS.md (React), «Корень и `ref` потребителя».
 */
export function Tabs(props: TabsProps): ReactElement | null {
	const { ref, forwardProps, state, layer } = useSetupTabs(props)

	const { rendered, shown, attrs, aria, dataset } = state

	if (!rendered) return null

	return (
		<div {...toRootProps(ref, state, [attrs, dataset], toRootForward(forwardProps))}>
			<Elevate layer={layer}>
				<div className="so-tabs__bar">
					{hasSlot(props.leading) ? (
						<div className="so-tabs__leading">{renderSlot(props.leading)}</div>
					) : null}
					<div
						className="so-tabs__list"
						{...toAriaProps(aria)}
						{...toControlAttrs<TabsAttributes>(forwardProps)}
					>
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
					</div>
					{hasSlot(props.trailing) ? (
						<div className="so-tabs__trailing">{renderSlot(props.trailing)}</div>
					) : null}
				</div>
				{renderSlot(props.content)}
			</Elevate>
		</div>
	)
}
