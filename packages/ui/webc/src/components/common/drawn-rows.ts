/**
 * Строки списка с группами по записям рисования (`drawnSections`) — ListBox и
 * панель Select: разделитель между секциями, группа с подписью и своей петлёй
 * записей, запись — элемент из данных или распорка окна. Группа ещё не в
 * документе, и её записи становятся светом — база группы раскладывает их в
 * слот по умолчанию, когда группа собирается.
 */

import type { TDrawable, TDrawnEntry, TDrawnSection } from '@soldy-ui/core'
import {
	TKeyedLoop,
	createItem,
	lendSamples,
	ownerStyles,
	type ITemplateContext,
	type TItemSlots,
	type TPartClass,
} from '../../adapter'

type TRow<TItem extends TDrawable> =
	| { readonly kind: 'separator'; readonly key: string }
	| { readonly kind: 'group'; readonly key: string; readonly section: TDrawnSection<TItem> }
	| TDrawnEntry<TItem>

export type TDrawnRowsSpec<TItem extends TDrawable> = {
	/** Блок классов разделителя и распорки: `so-<block>__separator`, `so-<block>__filler`. */
	readonly block: string
	readonly item: TPartClass<HTMLElement & { ctrl: TItem | undefined }>
	readonly group: TPartClass<HTMLElement & { label?: string }>
	/** Образцы владельца → слоты элемента из данных. */
	readonly slots: TItemSlots
}

type TRowsContext = Pick<ITemplateContext, 'root' | 'sample'>

function rowsOf<TItem extends TDrawable>(
	sections: readonly TDrawnSection<TItem>[],
	separated: boolean,
): TRow<TItem>[] {
	return sections.flatMap((section, index): TRow<TItem>[] => [
		...(separated && index > 0
			? [{ kind: 'separator' as const, key: `separator:${section.key}` }]
			: []),
		...(section.group
			? [{ kind: 'group' as const, key: section.key, section }]
			: section.entries),
	])
}

export class TDrawnRows<TItem extends TDrawable> {
	private readonly _loop: TKeyedLoop<TRow<TItem>, string | number, HTMLElement>
	private readonly _groups = new WeakMap<
		HTMLElement,
		TKeyedLoop<TDrawnEntry<TItem>, number, HTMLElement>
	>()

	constructor(
		parent: Node,
		end: Node | null,
		private readonly _spec: TDrawnRowsSpec<TItem>,
	) {
		this._loop = new TKeyedLoop(parent, end, (row) => row.key)
	}

	draw(
		ctx: TRowsContext,
		sections: readonly TDrawnSection<TItem>[] | undefined,
		separated: boolean,
	): void {
		this._loop.draw(
			rowsOf(sections ?? [], separated),
			(row) => this._rowOf(ctx, row),
			(node, row) => this._updateRow(ctx, node, row),
		)
	}

	private _rowOf(ctx: TRowsContext, row: TRow<TItem>): HTMLElement {
		if (row.kind === 'separator') {
			const separator = ctx.root.ownerDocument.createElement('div')

			separator.className = `so-${this._spec.block}__separator`
			separator.setAttribute('aria-hidden', 'true')

			return separator
		}

		if (row.kind === 'group') {
			const group = createItem(ctx.root.ownerDocument, this._spec.group)

			this._fillGroup(ctx, group, row.section)

			return group
		}

		return this._entryOf(ctx, row)
	}

	private _updateRow(ctx: TRowsContext, node: HTMLElement, row: TRow<TItem>): void {
		if (row.kind === 'separator') return

		if (row.kind === 'group') {
			if (node instanceof this._spec.group) this._fillGroup(ctx, node, row.section)

			return
		}

		updateEntry(node, row)
	}

	private _fillGroup(
		ctx: TRowsContext,
		group: HTMLElement & { label?: string },
		section: TDrawnSection<TItem>,
	): void {
		group.label = section.group?.label

		let loop = this._groups.get(group)

		if (!loop) {
			loop = new TKeyedLoop(group, null, (entry: TDrawnEntry<TItem>) => entry.key)
			this._groups.set(group, loop)
		}

		loop.draw(section.entries, (entry) => this._entryOf(ctx, entry), updateEntry)
	}

	/** Элемент из данных — инстанс и копии образцов до вставки — или распорка. */
	private _entryOf(ctx: TRowsContext, entry: TDrawnEntry<TItem>): HTMLElement {
		const { ownerDocument } = ctx.root

		if (entry.kind === 'filler') {
			const filler = ownerDocument.createElement('div')

			filler.className = `so-${this._spec.block}__filler`
			filler.setAttribute('aria-hidden', 'true')
			// Высота пропущенных и место в составе — из записи
			ownerStyles(filler, entry.style)

			return filler
		}

		const item = createItem(ownerDocument, this._spec.item)

		item.ctrl = entry.item
		lendSamples(ctx, item, this._spec.slots)

		return item
	}
}

/** Живой записи — её стиль: элемент из данных всё берёт у своего инстанса. */
function updateEntry<TItem extends TDrawable>(node: HTMLElement, entry: TDrawnEntry<TItem>): void {
	if (entry.kind === 'filler') ownerStyles(node, entry.style)
}
