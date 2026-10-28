import type { ElementType, ReactElement } from 'react'
import {
	renderSlot,
	roleIcon,
	toAriaProps,
	toControlAttrs,
	toRootForward,
	toRootProps,
	useClickAction,
	withRenderBoundary,
} from '../../../adapter'
import { Button } from '../../button'
import { Icon } from '../../icon'
import { useSetupTabsItem } from './setup.component'
import type { TabsItemAttributes, TabsItemProps } from './base.component'

/**
 * TabsItem — таб: строка `Button` с `role="tab"` и кнопка закрытия рядом с
 * ней. Атрибуты потребителя — строке: AGENTS.md (React), «Корень и `ref` потребителя».
 */
export const TabsItem = withRenderBoundary(function TabsItem(
	props: TabsItemProps,
): ReactElement | null {
	const { ref, forwardProps, state, context } = useSetupTabsItem(props)
	const activate = useClickAction(() => {
		if (context) context.adapters.activation.active = true
	})
	const close = useClickAction((event) => {
		// Stopped at the cross: the roots of the tab and the set would give `action:press`
		event.stopPropagation()
		context?.adapters.tabs.close()
	})

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
	const row = toControlAttrs<TabsItemAttributes>(forwardProps)

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
				ref={activate}
				leading={renderSlot(props.leading)}
				trailing={renderSlot(props.trailing)}
			>
				{renderSlot(props.children, { text: text ?? '', active: active ?? false }) ?? text}
			</Button>
			{tab_closable === true ? (
				<Button
					embedded="tabs.close"
					type="button"
					className="so-tabs-item__close"
					disabled={disabled}
					size={size}
					{...toAriaProps(closeAria)}
					ref={close}
				>
					{renderSlot(props['close-icon']) ?? (
						<Icon embedded="tabs.close-icon" tag={roleIcon('close')} size={size} />
					)}
				</Button>
			) : null}
		</Tag>
	)
})
