import type { ElementType, ReactElement } from 'react'
import { NativeInput, renderSlot, roleIcon, toAriaProps, toRootProps } from '../../../adapter'
import { Button } from '../../button'
import { Icon } from '../../icon'
import { useSetupTableColumn } from './setup.component'
import type { TableColumnProps } from './base.component'

const SortIcon = roleIcon('arrowUpward')

/**
 * TableColumn — заголовок колонки (`Table.Column`) с кнопкой сортировки и ручкой
 * ширины; поле ручки — `NativeInput` (AGENTS.md (React), «Поля ввода»).
 */
export function TableColumn(props: TableColumnProps): ReactElement | null {
	const { ref, forwardProps, state, column } = useSetupTableColumn(props)

	const {
		rendered,
		tag,
		text,
		sortable,
		disabled,
		widthStyle,
		textAria,
		sortAria,
		resizerRendered,
		resizer,
		resizerAria,
		attrs,
		aria,
		dataset,
	} = state

	if (!rendered) return null

	const Tag = tag as ElementType

	return (
		<Tag {...toRootProps(ref, state, [attrs, aria, dataset], forwardProps, widthStyle)}>
			<span className="so-table-column__content">
				<span className="so-table-column__text" {...toAriaProps(textAria)}>
					{renderSlot(props.children, {
						text: text ?? '',
						sortable: sortable ?? false,
					}) ?? text}
				</span>
				{sortable ? (
					<Button
						embedded="table.sort"
						type="button"
						className="so-table-column__sort"
						disabled={disabled}
						{...toAriaProps(sortAria)}
						onActionPress={() => column.toggleSort()}
					>
						<span className="so-table-column__sort-icon" aria-hidden="true">
							<Icon embedded="table.sort-icon" tag={SortIcon} />
						</span>
					</Button>
				) : null}
			</span>
			{resizerRendered && resizer ? (
				<span className="so-table-column__resizer">
					<NativeInput
						className="so-table-column__input"
						type="range"
						min={resizer.min}
						max={resizer.max}
						{...toAriaProps(resizerAria)}
						live={{ value: resizer.value }}
					/>
				</span>
			) : null}
		</Tag>
	)
}
