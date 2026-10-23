import type { ElementType, ReactElement } from 'react'
import { Elevate, relaySlot, renderSlot, roleIcon, toAriaProps, toRootProps } from '../../adapter'
import { Button } from '../button'
import { Icon } from '../icon'
import { PaginationItem } from './item'
import { useSetupPagination } from './setup.component'
import type { PaginationProps } from './base.component'

/** Одна иконка на обе стрелки: роли «влево» нет, стрелку к началу строки зеркалит тема. */
const Arrow = roleIcon('arrowRight')

/**
 * Pagination — стрелка «назад», список страниц и пропусков окна, стрелка «вперёд».
 * docs/agents/patterns.md, «Готовые паттерны» (Pagination).
 */
export function Pagination(props: PaginationProps): ReactElement | null {
	const { ctrl, ref, forwardProps, state, layer } = useSetupPagination(props)

	const {
		rendered,
		tag,
		attrs,
		aria,
		dataset,
		size,
		variant,
		prevDisabled,
		nextDisabled,
		prevAria,
		nextAria,
		cells,
	} = state

	if (!rendered) return null

	const Tag = tag as ElementType

	return (
		<Tag {...toRootProps(ref, state, [attrs, aria, dataset], forwardProps)}>
			<Elevate layer={layer}>
				<Button
					embedded="pagination.prev"
					type="button"
					className="so-pagination__prev"
					size={size}
					variant={variant}
					disabled={prevDisabled}
					onClick={() => ctrl.prev()}
					{...toAriaProps(prevAria)}
				>
					{renderSlot(props['prev-icon']) ?? (
						<Icon embedded="pagination.prev-icon" tag={Arrow} size={size} />
					)}
				</Button>

				<ol className="so-pagination__list">
					{cells?.map((cell) =>
						cell.kind === 'item' ? (
							<PaginationItem key={cell.key} ctrl={cell.item}>
								{relaySlot(props.item, { item: cell.item })}
							</PaginationItem>
						) : (
							<li key={cell.key} className="so-pagination__ellipsis">
								…
							</li>
						),
					)}
				</ol>

				<Button
					embedded="pagination.next"
					type="button"
					className="so-pagination__next"
					size={size}
					variant={variant}
					disabled={nextDisabled}
					onClick={() => ctrl.next()}
					{...toAriaProps(nextAria)}
				>
					{renderSlot(props['next-icon']) ?? (
						<Icon embedded="pagination.next-icon" tag={Arrow} size={size} />
					)}
				</Button>
			</Elevate>
		</Tag>
	)
}
