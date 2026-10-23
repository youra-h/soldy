/**
 * Свет элемента — его содержимое из разметки, разложенное по точкам шаблона.
 * Shadow DOM нет: тема — глобальные классы, и через теневую границу они не
 * проходят. Слот — по атрибуту `slot` (назначенный шаблоном владельца
 * главнее), слот без содержимого не задан, слот, которого шаблон не объявил,
 * не выводится. Раскладывается один раз, переносом силами базы. AGENTS.md
 * (Web Components), «Свет и слоты».
 */

import { DEFAULT_SLOT } from '@soldy-ui/setup'
import type { TSlotTarget, TSlotTargets } from '../template'
import { isContent } from './content'
import { assignSlot, isSlotMark, takeAssignedSlot } from './marks'
import { relocate } from './relocation'
import { TTeleport } from './teleport'

type TPlacedTarget = Exclude<TSlotTarget, { mode: 'sample' }>

/** У якоря увезённого корня и у спутника слот — корня: в свет они встают вместо него. */
function slotOf(node: ChildNode): string {
	const assigned = takeAssignedSlot(node)

	if (assigned !== undefined) return assigned

	const element = TTeleport.rootAt(node) ?? (node instanceof Element ? node : undefined)

	return element?.getAttribute('slot') ?? DEFAULT_SLOT
}

function groupBySlot(nodes: readonly ChildNode[]): Map<string, ChildNode[]> {
	const groups = new Map<string, ChildNode[]>()

	for (const node of nodes) {
		const name = slotOf(node)
		const group = groups.get(name)

		if (group) {
			group.push(node)
		} else {
			groups.set(name, [node])
		}
	}

	return groups
}

/** Только свои ключи: `slot="toString"` не найдёт метод объекта. */
function targetOf(targets: TSlotTargets, name: string): TSlotTarget | undefined {
	return Object.hasOwn(targets, name) ? targets[name] : undefined
}

function place(node: ChildNode, target: TPlacedTarget): void {
	if (target.slot !== undefined) assignSlot(node, target.slot)

	if (target.mode === 'append') {
		target.node.appendChild(node)
	} else {
		target.node.parentNode?.insertBefore(node, target.node)
	}
}

/** Копия узла образца: у `<template>` — его содержимого; без `slot` — место назначает шаблон. */
function copyOf(node: ChildNode, owner: Document): Node {
	if (node instanceof HTMLTemplateElement) return owner.importNode(node.content, true)

	const copy = node.cloneNode(true)

	if (copy instanceof Element) copy.removeAttribute('slot')

	return copy
}

export class TLight {
	/** Заданные слоты; `null` — структура ещё не построена. */
	private _slots: Map<string, ChildNode[]> | null = null
	private _targets: TSlotTargets = {}
	/** Слоты, которые привязка сняла: их содержимое вне документа. */
	private readonly _hidden = new Set<string>()
	private _content: HTMLElement

	constructor(private readonly _host: HTMLElement) {
		this._content = _host
	}

	get built(): boolean {
		return this._slots !== null
	}

	/** Узел слота по умолчанию; его нет (ProgressSpinner) — сам элемент. */
	get content(): HTMLElement {
		return this._content
	}

	has(name: string): boolean {
		return this._slots?.has(name) ?? false
	}

	/** Свет по слотам — до построения шаблона: обёртку слота он строит, только когда она нужна. */
	gather(): ReadonlyMap<string, ChildNode[]> {
		const groups = groupBySlot(Array.from(this._host.childNodes))
		const slots = new Map<string, ChildNode[]>()

		// Слот с меткой владельца задан и пустым
		for (const [name, nodes] of groups) {
			if (nodes.some((node) => isContent(node) || isSlotMark(node))) slots.set(name, nodes)
		}

		this._slots = slots

		return groups
	}

	/** По точкам в порядке их объявления; образец уходит из документа, лишнее снимается. */
	distribute(groups: ReadonlyMap<string, ChildNode[]>, targets: TSlotTargets): void {
		const fallback = targetOf(targets, DEFAULT_SLOT)

		this._content = fallback?.mode === 'append' ? fallback.node : this._host
		this._targets = targets

		for (const [name, target] of Object.entries(targets)) {
			const nodes = this._slots?.get(name)

			if (!nodes) continue

			if (target.mode === 'sample') {
				for (const node of nodes) node.remove()

				continue
			}

			relocate(nodes, () => {
				for (const node of nodes) place(node, target)
			})
		}

		for (const [name, nodes] of groups) {
			if (this._slots?.has(name) && targetOf(targets, name)) continue

			for (const node of nodes) node.remove()
		}
	}

	/** Слот, который выводит привязка (`showSlot`): снятое уходит из документа. */
	show(name: string, shown: boolean): void {
		const nodes = this._slots?.get(name)
		const target = targetOf(this._targets, name)

		if (!nodes || !target || target.mode === 'sample' || this._hidden.has(name) !== shown) {
			return
		}

		if (shown) {
			this._hidden.delete(name)
			relocate(nodes, () => {
				for (const node of nodes) place(node, target)
			})
		} else {
			this._hidden.add(name)

			for (const node of nodes) node.remove()
		}
	}

	/** Узлы слота в его точке — копией списка; образец — пусто. */
	slotted(name: string): readonly ChildNode[] {
		const nodes = this._slots?.get(name)
		const target = targetOf(this._targets, name)

		if (!nodes || !target || target.mode === 'sample') return []

		return [...nodes]
	}

	/** Новая копия образца на каждый вызов. */
	sample(name: string): DocumentFragment | null {
		const nodes = this._slots?.get(name)

		if (!nodes || targetOf(this._targets, name)?.mode !== 'sample') return null

		const owner = this._host.ownerDocument
		const copy = owner.createDocumentFragment()

		for (const node of nodes) copy.append(copyOf(node, owner))

		return copy
	}
}
