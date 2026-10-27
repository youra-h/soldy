import type { ElementType, ReactElement } from 'react'
import {
	renderSlot,
	roleIcon,
	toAriaProps,
	toControlAttrs,
	toRootForward,
	toRootProps,
	useClickAction,
} from '../../../adapter'
import { ItemRow } from '../../item-row'
import { Icon } from '../../icon'
import { useSetupListBoxItem } from './setup.component'
import type { ListBoxItemAttributes, ListBoxItemProps } from './base.component'

/**
 * ListBoxItem — элемент списка: корень по `tag` и строка-опция — `ItemRow` на `div`
 * (под этот тег написан `TListBoxItem._ariaTag`).
 */
export function ListBoxItem(props: ListBoxItemProps): ReactElement | null {
	const { ref, forwardProps, state, context } = useSetupListBoxItem(props)
	const choose = useClickAction(() => context?.adapters.list.choose())

	const {
		rendered,
		tag,
		text,
		view,
		disabled,
		size,
		variant,
		selected,
		indicator,
		aria,
		dataset,
		attrs,
	} = state

	if (!rendered) return null

	const Tag = tag as ElementType
	const chosen = selected ?? false
	const row = toControlAttrs<ListBoxItemAttributes>(forwardProps)

	const mark = (
		<span className="so-list-box-item__indicator" aria-hidden="true">
			{renderSlot(props['indicator-icon'], { selected: chosen }) ??
				(chosen ? (
					<Icon embedded="list-box.indicator" tag={roleIcon('check')} size={size} />
				) : null)}
		</span>
	)

	return (
		<Tag {...toRootProps(ref, state, [dataset, attrs], toRootForward(forwardProps))}>
			<ItemRow
				embedded="list-box.row"
				tag="div"
				view={view}
				disabled={disabled}
				size={size}
				variant={variant}
				{...toAriaProps(aria)}
				{...toAriaProps(dataset)}
				{...row}
				ref={choose}
				leading={
					<>
						{indicator === 'start' ? mark : null}
						{renderSlot(props.leading)}
					</>
				}
				trailing={
					<>
						{renderSlot(props.trailing)}
						{indicator === 'end' ? mark : null}
					</>
				}
			>
				{renderSlot(props.children, { text: text ?? '', selected: chosen }) ?? text}
			</ItemRow>
		</Tag>
	)
}
