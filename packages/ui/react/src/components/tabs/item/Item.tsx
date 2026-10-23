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
import { useSetupTabsItem } from './setup.component'
import type { TabsItemAttributes, TabsItemProps } from './base.component'

/**
 * TabsItem — таб: строка `Button` с `role="tab"` и кнопка закрытия рядом с
 * ней. Атрибуты потребителя — строке: AGENTS.md (React), «Корень и `ref` потребителя».
 */
export function TabsItem(props: TabsItemProps): ReactElement | null {
	const { ref, forwardProps, state, context } = useSetupTabsItem(props)

	const {
		rendered,
		tag,
		text,
		disabled,
		size,
		variant,
		active,
		tab_closable,
		closeAria,
		aria,
		dataset,
		attrs,
	} = state

	if (!rendered) return null

	const Tag = tag as ElementType
	const { onClick, ...row } = toControlAttrs<TabsItemAttributes>(forwardProps)

	return (
		<Tag {...toRootProps(ref, state, [dataset, attrs], toRootForward(forwardProps))}>
			<Button
				embedded="tabs.row"
				type="button"
				disabled={disabled}
				size={size}
				variant={variant}
				{...toAriaProps(aria)}
				{...row}
				onClick={(event) => {
					if (context) context.adapters.activation.active = true
					onClick?.(event)
				}}
				leading={renderSlot(props.leading)}
				trailing={renderSlot(props.trailing)}
			>
				{renderSlot(props.children, { text: text ?? '', active: active ?? false }) ?? text}
			</Button>
			<Button
				embedded="tabs.close"
				type="button"
				rendered={tab_closable === true}
				className="so-tabs-item__close"
				disabled={disabled}
				size={size}
				{...toAriaProps(closeAria)}
				onActionClick={(event) => {
					// Нативное событие: синтетическое к этому времени уже прошло корни таба и
					// набора, и их `TActionPlugin` отдал бы `action:press` на клик по крестику
					event.stopPropagation()
					context?.adapters.tabs.close()
				}}
			>
				{renderSlot(props['close-icon']) ?? (
					<Icon embedded="tabs.close-icon" tag={roleIcon('close')} size={size} />
				)}
			</Button>
		</Tag>
	)
}
