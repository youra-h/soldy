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
import { ItemRow } from '../../item-row'
import { Icon } from '../../icon'
import { useSetupTagsItem } from './setup.component'
import type { TagsItemAttributes, TagsItemProps } from './base.component'

/** Глиф крестика без слота — компонент на роль: `tag` у Icon — корень, а не роль. */
const CloseIcon = roleIcon('close')

/**
 * TagsItem — тег: корень-пилюля по `tag`, в нём строка — `ItemRow` на `div` — и крестик рядом
 * со строкой, а не в ней: потомки опции для скринридера презентационны.
 */
export const TagsItem = withRenderBoundary(function TagsItem(
	props: TagsItemProps,
): ReactElement | null {
	const { ref, forwardProps, state, context } = useSetupTagsItem(props)
	const close = useClickAction((event) => {
		// Stopped at the cross: the roots of the tag and the set and the Select field would
		// take the click as theirs
		event.stopPropagation()
		context?.adapters.tags.close()
	})

	const {
		rendered,
		tag,
		text,
		direction,
		disabled,
		size,
		variant,
		selected,
		tag_closable,
		closeAria,
		aria,
		dataset,
		attrs,
	} = state

	if (!rendered) return null

	const Tag = tag as ElementType

	return (
		<Tag {...toRootProps(ref, state, [dataset, attrs], toRootForward(forwardProps))}>
			<ItemRow
				embedded="tags.row"
				tag="div"
				direction={direction}
				disabled={disabled}
				size={size}
				variant={variant}
				{...toAriaProps(aria)}
				{...toControlAttrs<TagsItemAttributes>(forwardProps)}
				// `press`, а не клик: на выключенный тег он не приходит, `toggle` это не проверяет
				onActionPress={() => context?.adapters.selection.toggle()}
				leading={renderSlot(props.leading)}
				trailing={renderSlot(props.trailing)}
			>
				{renderSlot(props.children, { text: text ?? '', selected: selected ?? false }) ??
					text}
			</ItemRow>
			{tag_closable === true ? (
				<Button
					embedded="tags.close"
					type="button"
					className="so-tags-item__close"
					disabled={disabled}
					size={size}
					{...toAriaProps(closeAria)}
					ref={close}
				>
					{renderSlot(props['close-icon']) ?? (
						<Icon embedded="tags.close-icon" tag={CloseIcon} size={size} />
					)}
				</Button>
			) : null}
		</Tag>
	)
})
