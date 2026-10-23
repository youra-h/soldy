import type { ElementType, ReactElement } from 'react'
import { Elevate, Teleport, relaySlot, renderSlot, toRootProps } from '../../adapter'
import { ToastsItem } from './item'
import { useSetupToasts } from './setup.component'
import type { ToastsProps } from './base.component'

/**
 * Toasts — менеджер уведомлений: оборачивает приложение (`children`), регион
 * тостов — телепортом. AGENTS.md (React), «Teleport» и «Локаль и тосты».
 */
export function Toasts(props: ToastsProps): ReactElement {
	const { ref, forwardProps, state, layer } = useSetupToasts(props)

	const { rendered, tag, target, attrs, aria, dataset, shown } = state

	const Tag = tag as ElementType

	return (
		<Elevate layer={layer}>
			{renderSlot(props.children)}
			{rendered ? (
				<Teleport to={target}>
					<Tag {...toRootProps(ref, state, [attrs, aria, dataset], forwardProps)}>
						<ol className="so-toasts__list">
							{shown?.map((item) => (
								<ToastsItem
									key={item.uid}
									ctrl={item}
									icon={relaySlot(props['item-icon'], { item })}
									content={renderSlot(props['item-content'], { item })}
									close-icon={renderSlot(props['item-close-icon'], { item })}
								>
									{relaySlot(props.item, { item })}
								</ToastsItem>
							))}
						</ol>
					</Tag>
				</Teleport>
			) : null}
		</Elevate>
	)
}
