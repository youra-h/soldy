import type { ReactElement } from 'react'
import type { IListBoxItem, TDrawnEntry, TDrawnSection } from '@soldy-ui/core'
import {
	Elevate,
	hasSlot,
	relaySlot,
	renderSlot,
	toAriaProps,
	toControlAttrs,
	toReactStyle,
	toRootForward,
	toRootProps,
} from '../../adapter'
import { ListBoxItem } from './item'
import { ListBoxGroup } from './group'
import { useSetupListBox } from './setup.component'
import type { ListBoxAttributes, ListBoxProps } from './base.component'

/** Элемент из данных со слотами списка или распорка окна на месте пропущенных. */
function drawEntry(props: ListBoxProps, entry: TDrawnEntry<IListBoxItem>): ReactElement {
	if (entry.kind === 'filler') {
		return (
			<div
				key={entry.key}
				className="so-list-box__filler"
				aria-hidden="true"
				style={toReactStyle(entry.style)}
			/>
		)
	}

	return (
		<ListBoxItem
			key={entry.key}
			ctrl={entry.item}
			leading={renderSlot(props['item-leading'], { item: entry.item })}
			trailing={renderSlot(props['item-trailing'], { item: entry.item })}
			indicator-icon={relaySlot(props['item-indicator-icon'], { item: entry.item })}
		>
			{relaySlot(props.item, { item: entry.item })}
		</ListBoxItem>
	)
}

/** Ключи записи (число), группы и разделителя секции не пересекаются. */
function drawSection(
	props: ListBoxProps,
	section: TDrawnSection<IListBoxItem>,
	separated: boolean,
): ReactElement[] {
	const entries = section.entries.map((entry) => drawEntry(props, entry))
	const separator = separated
		? [
				<div
					key={`separator:${section.key}`}
					className="so-list-box__separator"
					aria-hidden="true"
				/>,
			]
		: []

	if (!section.group) return [...separator, ...entries]

	return [
		...separator,
		<ListBoxGroup key={section.key} label={section.group.label}>
			{entries}
		</ListBoxGroup>,
	]
}

/**
 * ListBox — список с выбором: корень-рамка, в ней шапка, узел списка с `aria` и остановкой Tab
 * и подвал. docs/agents/patterns.md, «Граница переиспользования между похожими компонентами
 * (критично)»; петля по секциям — docs/agents/collections.md, «Рисование — механизм коллекции».
 */
export function ListBox(props: ListBoxProps): ReactElement | null {
	const { ref, forwardProps, state, layer } = useSetupListBox(props)

	const { rendered, drawnSections, groupSeparators, shown, attrs, aria, dataset } = state

	if (!rendered) return null

	return (
		<div {...toRootProps(ref, state, [attrs, dataset], toRootForward(forwardProps))}>
			<Elevate layer={layer}>
				{renderSlot(props.header)}
				<div
					className="so-list-box__list"
					tabIndex={0}
					{...toAriaProps(aria)}
					{...toControlAttrs<ListBoxAttributes>(forwardProps)}
				>
					{hasSlot(props.children)
						? renderSlot(props.children)
						: drawnSections?.flatMap((section, index) =>
								drawSection(props, section, groupSeparators === true && index > 0),
							)}
					{shown?.length === 0 ? renderSlot(props.empty) : null}
				</div>
				{renderSlot(props.footer)}
			</Elevate>
		</div>
	)
}
