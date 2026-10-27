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
import { useSetupSelectItem } from './setup.component'
import type { SelectItemAttributes, SelectItemProps } from './base.component'

/** Отметка без слота — иконка из пакета по роли, компонент на роль один на модуль. */
const CheckIcon = roleIcon('check')

/**
 * SelectItem — опция списка панели: корень по `tag` и строка-опция — `ItemRow` на `span`
 * (под этот тег написан `TSelectItem._ariaTag`).
 */
export function SelectItem(props: SelectItemProps): ReactElement | null {
	const { ref, forwardProps, state, context } = useSetupSelectItem(props)
	const choose = useClickAction(() => context?.adapters.select.choose())

	const {
		rendered,
		tag,
		text,
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
	const row = toControlAttrs<SelectItemAttributes>(forwardProps)

	const mark = (
		<span className="so-select-item__indicator" aria-hidden="true">
			{renderSlot(props['indicator-icon'], { selected: chosen }) ??
				(chosen ? <Icon embedded="select.indicator" tag={CheckIcon} size={size} /> : null)}
		</span>
	)

	return (
		<Tag {...toRootProps(ref, state, [dataset, attrs], toRootForward(forwardProps))}>
			<ItemRow
				embedded="select.row"
				tag="span"
				size={size}
				variant={variant}
				disabled={disabled}
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
