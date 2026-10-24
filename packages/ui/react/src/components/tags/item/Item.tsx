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
import { useSetupTagsItem } from './setup.component'
import type { TagsItemAttributes, TagsItemProps } from './base.component'

/** Глиф крестика без слота — компонент на роль: `tag` у Icon — корень, а не роль. */
const CloseIcon = roleIcon('close')

/**
 * TagsItem — тег: корень-пилюля по `tag`, в нём строка и крестик рядом со строкой, а не в ней:
 * потомки опции для скринридера презентационны. Строка — `Button` над экземпляром тега
 * (`row`, `TOwnedButton` на `div`): размер, вариант, выключенность и направление ей пишет
 * тег, а роль и `tabindex` — его набор `aria`. Ключ — экземпляр: пересобранный тег без `ctrl`
 * — новая строка, и кнопка над ней монтируется заново (AGENTS.md (React), «Пересобранный
 * инстанс и `key`»).
 */
export function TagsItem(props: TagsItemProps): ReactElement | null {
	const { ref, forwardProps, state, context, row } = useSetupTagsItem(props)

	const {
		rendered,
		tag,
		text,
		disabled,
		size,
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
			<Button
				key={row.uid}
				embedded="tags.row"
				ctrl={row}
				{...toAriaProps(aria)}
				{...toControlAttrs<TagsItemAttributes>(forwardProps)}
				// `press`, а не клик: на выключенный тег он не приходит, `toggle` это не проверяет
				onActionPress={() => context?.adapters.selection.toggle()}
				leading={renderSlot(props.leading)}
				trailing={renderSlot(props.trailing)}
			>
				{renderSlot(props.children, { text: text ?? '', selected: selected ?? false }) ??
					text}
			</Button>
			<Button
				embedded="tags.close"
				type="button"
				rendered={tag_closable === true}
				className="so-tags-item__close"
				disabled={disabled}
				size={size}
				{...toAriaProps(closeAria)}
				// Гасит нативное событие: синтетическое уже прошло бы `TActionPlugin` тега
				// и набора, и поле Select открыло бы панель по клику на крестик
				onActionClick={(event) => {
					event.stopPropagation()
					context?.adapters.tags.close()
				}}
			>
				{renderSlot(props['close-icon']) ?? (
					<Icon embedded="tags.close-icon" tag={CloseIcon} size={size} />
				)}
			</Button>
		</Tag>
	)
}
