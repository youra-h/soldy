import type { ElementType, ReactElement } from 'react'
import {
	renderSlot,
	roleIcon,
	toAriaProps,
	toControlAttrs,
	toRootForward,
	toRootProps,
} from '../../../adapter'
import { Button } from '../../button'
import { Icon } from '../../icon'
import { useSetupListBoxItem } from './setup.component'
import type { ListBoxItemAttributes, ListBoxItemProps } from './base.component'

/**
 * ListBoxItem — элемент списка: корень по `tag` и строка-опция — `Button` над экземпляром
 * элемента (`row`, `TItemRow` на `div`; под этот тег написан `TListBoxItem._ariaTag`): тег,
 * размер, вариант, выключенность и вид ей пишет элемент, а роль и `tabindex` — его набор
 * `aria`. Ключ — экземпляр: пересобранный элемент без `ctrl` — новая строка, и кнопка над ней
 * монтируется заново (AGENTS.md (React), «Пересобранный инстанс и `key`»).
 */
export function ListBoxItem(props: ListBoxItemProps): ReactElement | null {
	const { ref, forwardProps, state, context, row } = useSetupListBoxItem(props)

	const { rendered, tag, text, size, selected, indicator, aria, dataset, attrs } = state

	if (!rendered) return null

	const Tag = tag as ElementType
	const chosen = selected ?? false
	// Клик потребителя — после выбора, как у Vue, где слушатели складываются
	const { onClick, ...rowAttrs } = toControlAttrs<ListBoxItemAttributes>(forwardProps)

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
			<Button
				key={row.uid}
				embedded="list-box.row"
				ctrl={row}
				{...toAriaProps(aria)}
				{...toAriaProps(dataset)}
				{...rowAttrs}
				onClick={(event) => {
					context?.adapters.list.choose()
					onClick?.(event)
				}}
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
			</Button>
		</Tag>
	)
}
