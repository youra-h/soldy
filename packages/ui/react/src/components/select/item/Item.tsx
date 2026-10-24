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
import { useSetupSelectItem } from './setup.component'
import type { SelectItemAttributes, SelectItemProps } from './base.component'

/** Отметка без слота — иконка из пакета по роли, компонент на роль один на модуль. */
const CheckIcon = roleIcon('check')

/**
 * SelectItem — опция списка панели: корень по `tag` и строка-опция — `Button` над экземпляром
 * опции (`row`, `TItemRow` на `span`; под этот тег написан `TSelectItem._ariaTag`): тег,
 * размер, вариант и выключенность ей пишет опция, а роль и `tabindex="-1"` — её набор `aria`.
 * Ключ — экземпляр: пересобранная опция без `ctrl` — новая строка, и кнопка над ней
 * монтируется заново (AGENTS.md (React), «Пересобранный инстанс и `key`»).
 */
export function SelectItem(props: SelectItemProps): ReactElement | null {
	const { ref, forwardProps, state, context, row } = useSetupSelectItem(props)

	const { rendered, tag, text, size, selected, indicator, aria, dataset, attrs } = state

	if (!rendered) return null

	const Tag = tag as ElementType
	const chosen = selected ?? false
	const { onClick, ...rowAttrs } = toControlAttrs<SelectItemAttributes>(forwardProps)

	const mark = (
		<span className="so-select-item__indicator" aria-hidden="true">
			{renderSlot(props['indicator-icon'], { selected: chosen }) ??
				(chosen ? <Icon embedded="select.indicator" tag={CheckIcon} size={size} /> : null)}
		</span>
	)

	return (
		<Tag {...toRootProps(ref, state, [dataset, attrs], toRootForward(forwardProps))}>
			<Button
				key={row.uid}
				embedded="select.row"
				ctrl={row}
				{...toAriaProps(aria)}
				{...toAriaProps(dataset)}
				{...rowAttrs}
				onClick={(event) => {
					context?.adapters.select.choose()
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
