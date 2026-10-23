import type { ElementType, ReactElement } from 'react'
import { renderSlot, toRootProps } from '../../adapter'
import { useSetupSkeleton } from './setup.component'
import type { SkeletonProps } from './base.component'

/** Skeleton — заглушка поверх будущего содержимого; корень с содержимым есть всегда. */
export function Skeleton(props: SkeletonProps): ReactElement {
	const { ref, forwardProps, state } = useSetupSkeleton(props)

	const { tag, classes, layout_styles, present, aria, attrs } = state

	const Tag = tag as ElementType

	// Без `rendered` и `visible`: они прячут только заглушку (`present`), не корень
	return (
		<Tag {...toRootProps(ref, { classes, layout_styles }, [attrs, aria], forwardProps)}>
			{present ? <div className="so-skeleton__placeholder" aria-hidden="true" /> : null}
			{renderSlot(props.children)}
		</Tag>
	)
}
