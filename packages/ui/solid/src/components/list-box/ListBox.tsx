import type { Accessor, JSX } from 'solid-js'
import type { IListBoxItem, TDrawnEntry, TDrawnSection } from '@soldy-ui/core'
import {
	Elevate,
	KeyedFor,
	ResolvedSlot,
	createPartProps,
	createRootProps,
	relaySlot,
	renderSlot,
	toControlAttrs,
	toRootForward,
} from '../../adapter'
import { Show } from '../../adapter/runtime/flow'
import { ListBoxItem } from './item'
import { ListBoxGroup } from './group'
import { setupListBox } from './setup.component'
import type { ListBoxAttributes, ListBoxProps } from './base.component'

/** Элемент записи; у распорки его нет. */
function itemOf(entry: TDrawnEntry<IListBoxItem>): IListBoxItem | undefined {
	return entry.kind === 'item' ? entry.item : undefined
}

/** Стиль распорки — высота пропущенных элементов; у записи элемента его нет. */
function fillerStyleOf(entry: TDrawnEntry<IListBoxItem>): JSX.CSSProperties | undefined {
	return entry.kind === 'filler' ? entry.style : undefined
}

/**
 * Список с выбором: корень — рамка (шапка, узел списка, подвал), а набор `aria` и
 * атрибуты потребителя, кроме класса и стиля, — узлу списка. Элементы и распорки
 * секции — одной петлёй: петли по блокам перемонтировали бы элемент при переходе.
 */
export function ListBox(props: ListBoxProps): JSX.Element {
	const binding = setupListBox(props)
	const state = binding.state
	const root = createRootProps(() => ({
		state,
		sets: [state.attrs, state.dataset],
		forward: toRootForward(binding.forwardProps()),
	}))
	const aria = createPartProps(() => state.aria)
	const control = createPartProps(() => toControlAttrs<ListBoxAttributes>(binding.forwardProps()))

	/** Элемент из данных — со слотами списка, проброшенными целиком. */
	const drawItem = (item: IListBoxItem) => (
		<ListBoxItem
			ctrl={item}
			leading={renderSlot(props['item-leading'], { item })}
			trailing={renderSlot(props['item-trailing'], { item })}
			indicator-icon={relaySlot(props['item-indicator-icon'], { item })}
		>
			{relaySlot(props.item, { item })}
		</ListBoxItem>
	)

	/** Запись `drawn`: элемент или распорка на месте пропущенных. */
	const drawEntry = (entry: Accessor<TDrawnEntry<IListBoxItem>>) => (
		<Show
			when={itemOf(entry())}
			keyed
			fallback={
				<div
					class="so-list-box__filler"
					aria-hidden="true"
					style={fillerStyleOf(entry())}
				/>
			}
		>
			{drawItem}
		</Show>
	)

	/** Записи секции по порядку — по ключу записи. */
	const drawEntries = (section: Accessor<TDrawnSection<IListBoxItem>>) => (
		<KeyedFor each={section().entries} by={(entry) => entry.key}>
			{drawEntry}
		</KeyedFor>
	)

	/** Первая ли секция: перед ней разделителя нет. */
	const isFirst = (section: Accessor<TDrawnSection<IListBoxItem>>) =>
		state.drawnSections?.[0]?.key === section().key

	/**
	 * Секция: разделитель перед ней, если она не первая и список их просит
	 * (`groupSeparators`), а дальше группа с подписью или записи без группы
	 * прямо в списке.
	 */
	const drawSection = (section: Accessor<TDrawnSection<IListBoxItem>>) => (
		<>
			<Show when={state.groupSeparators && !isFirst(section)}>
				<div class="so-list-box__separator" aria-hidden="true" />
			</Show>
			<Show when={section().group} fallback={drawEntries(section)}>
				{(group) => (
					<ListBoxGroup label={group().label}>{drawEntries(section)}</ListBoxGroup>
				)}
			</Show>
		</>
	)

	return (
		<Show when={state.rendered}>
			<div {...root()} ref={binding.ref}>
				<Elevate layer={binding.layer}>
					{renderSlot(props.header)}
					<div class="so-list-box__list" tabindex="0" {...aria()} {...control()}>
						<ResolvedSlot
							content={props.children}
							fallback={
								<KeyedFor each={state.drawnSections} by={(section) => section.key}>
									{drawSection}
								</KeyedFor>
							}
						/>
						<Show when={state.shown?.length === 0}>{renderSlot(props.empty)}</Show>
					</div>
					{renderSlot(props.footer)}
				</Elevate>
			</div>
		</Show>
	)
}
