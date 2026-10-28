import type { ElementType, ReactElement } from 'react'
import { renderSlot, toRootProps, withRenderBoundary } from '../../../adapter'
import { useSetupCalendarItem } from './setup.component'
import type { CalendarItemProps } from './base.component'

/** CalendarItem — день календаря, корень — ячейка сетки: docs/agents/dates.md, «Даты». */
export const CalendarItem = withRenderBoundary(function CalendarItem(
	props: CalendarItemProps,
): ReactElement | null {
	const { ref, forwardProps, state } = useSetupCalendarItem(props)

	const { rendered, tag, text, attrs, aria, dataset } = state

	if (!rendered) return null

	const Tag = tag as ElementType

	return (
		<Tag {...toRootProps(ref, state, [attrs, aria, dataset], forwardProps)}>
			<div className="so-calendar-item__day">
				{renderSlot(props.children, { text: text ?? '' }) ?? text}
			</div>
		</Tag>
	)
})
