import type { ElementType, ReactElement } from 'react'
import { renderSlot, toAriaProps, toRootProps } from '../../../adapter'
import { Button } from '../../button'
import { useSetupPaginationItem } from './setup.component'
import type { PaginationItemProps } from './base.component'

/** PaginationItem — страница пагинации, внутренняя часть: её рисует только `Pagination`. */
export function PaginationItem(props: PaginationItemProps): ReactElement | null {
	const { ref, forwardProps, state, context } = useSetupPaginationItem(props)

	const { rendered, tag, text, disabled, size, variant, aria, dataset, attrs } = state

	if (!rendered) return null

	const Tag = tag as ElementType

	return (
		<Tag {...toRootProps(ref, state, [attrs, dataset], forwardProps)}>
			<Button
				embedded="pagination.page"
				type="button"
				disabled={disabled}
				size={size}
				variant={variant}
				onClick={() => {
					if (context) context.adapters.activation.active = true
				}}
				{...toAriaProps(aria)}
			>
				{renderSlot(props.children, { text: text ?? '' }) ?? text}
			</Button>
		</Tag>
	)
}
