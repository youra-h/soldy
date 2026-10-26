/**
 * Layout of the core onto the root: classes, the attribute sets as layers of
 * `TElementAttributes`, plugin outputs and the style — one effect per root.
 * The root may be a template node that does not exist before the first render
 * and may be replaced: a new node has an empty layout memory, and the first
 * layout on it writes everything.
 */

import { effect, type Signal } from '@angular/core'
import type { TStateSnapshot } from '@soldy-ui/setup'
import {
	NO_ATTRIBUTES,
	TElementAttributes,
	applyClasses,
	applyStyles,
	attributesOf,
	classesOf,
	orderOf,
	stylesOf,
	type TAppliedClasses,
	type TAppliedStyles,
	type TRootStyles,
} from '../root-attributes'
import type { TRootPaint, TRootSet } from './spec'

export type TNode = () => Element | null

/** A read of state: of the component, or what the base draws on the root. */
export type TStateRead = () => TStateSnapshot

/** Nothing to draw: what the base draws on a layer away from its place. */
export const NO_STATE: TStateSnapshot = Object.freeze({})

const ROOT_SETS: readonly TRootSet[] = ['attrs', 'aria', 'dataset']
const NO_APPLIED_CLASSES: TAppliedClasses = new Set()
export const NO_APPLIED_STYLES: TAppliedStyles = new Map()
/** The top layer of the style of a root its style hides, not the host binding. */
const HIDDEN_ROOT: object = Object.freeze({ display: 'none' })
const COMPANION_SHOWN: TRootStyles = new Map()
const COMPANION_HIDDEN: TRootStyles = new Map([['display', 'none']])

/** Эффект записи в узел, когда он есть. */
export function onNode(target: TNode, write: (node: Element) => void): void {
	effect(() => {
		const node = target()

		if (node) write(node)
	})
}

/** Эффект раскладки с памятью прошлой записи — своей у каждого узла. */
function paintOn<TApplied>(
	target: TNode,
	empty: TApplied,
	paint: (node: Element, applied: TApplied) => TApplied,
): void {
	let on: Element | null = null
	let applied = empty

	onNode(target, (node) => {
		applied = paint(node, on === node ? applied : empty)
		on = node
	})
}

/** The value `name` of the state is another object than at the last layout. */
function moved(last: TStateSnapshot, next: TStateSnapshot, name: string | undefined): boolean {
	return name !== undefined && last[name] !== next[name]
}

/**
 * Layer `name` of the root: the core set when the description puts it on the
 * root (`sets`), and in the `attrs` layer under the set — the `id` of the root
 * (at Vue `:id` stands before `v-bind`).
 */
function setLayer(drawn: TStateSnapshot, own: string | undefined, id: string | undefined): object {
	const set = own === undefined ? NO_ATTRIBUTES : attributesOf(drawn[own])

	return id === undefined ? set : { id: drawn[id], ...set }
}

/**
 * Layout memory of one root: its node and the state of the last layout on it.
 * A layer is written when the node is new or a state value the layer is built
 * from is another object: the binding replaces a value only when its content
 * changes, so a change of a property no layer reads writes nothing — the
 * identity check does the work a `computed` per layer did.
 */
class TRootPainter {
	private _node: Element | null = null
	private _drawn: TStateSnapshot = NO_STATE
	private _hidden = false
	private _classes: TAppliedClasses = NO_APPLIED_CLASSES
	private _styles: TAppliedStyles = NO_APPLIED_STYLES

	constructor(private readonly _paint: TRootPaint) {}

	paint(node: Element, drawn: TStateSnapshot, hidden: boolean): void {
		const paint = this._paint
		const fresh = node !== this._node
		const last = this._drawn

		if (fresh || moved(last, drawn, 'classes')) {
			this._classes = applyClasses(
				node,
				classesOf(drawn['classes']),
				fresh ? NO_APPLIED_CLASSES : this._classes,
			)
		}

		const sets = paint.sets ?? ROOT_SETS

		for (const name of ROOT_SETS) {
			const own = sets.includes(name)
				? name === 'aria'
					? (paint.aria ?? 'aria')
					: name
				: undefined
			const id = name === 'attrs' ? paint.id : undefined

			if (own === undefined && id === undefined) continue

			if (fresh || moved(last, drawn, own) || moved(last, drawn, id)) {
				TElementAttributes.of(node).set(name, setLayer(drawn, own, id))
			}
		}

		const plugins = paint.plugins

		if (plugins && (fresh || plugins.some((name) => moved(last, drawn, name)))) {
			const layer: Record<string, unknown> = {}

			for (const name of plugins) Object.assign(layer, attributesOf(drawn[name]))

			TElementAttributes.of(node).set('plugins', layer)
		}

		const order = paint.order === undefined ? undefined : 'order'

		if (
			fresh ||
			hidden !== this._hidden ||
			moved(last, drawn, 'layout_styles') ||
			moved(last, drawn, paint.style) ||
			moved(last, drawn, order)
		) {
			this._styles = applyStyles(
				node,
				stylesOf(
					drawn['layout_styles'],
					paint.style === undefined ? undefined : drawn[paint.style],
					orderOf(paint.order, drawn['order']),
					hidden ? HIDDEN_ROOT : undefined,
				),
				fresh ? NO_APPLIED_STYLES : this._styles,
			)
		}

		this._node = node
		this._drawn = drawn
		this._hidden = hidden
	}
}

/**
 * Layout of `drawn` onto the root `target()` — one effect. `hidden` — at a root
 * its style hides (the toasts region): hidden, it gets `display: none` as the
 * top layer.
 */
export function paintRoot(
	target: TNode,
	paint: TRootPaint,
	drawn: TStateRead,
	hidden?: Signal<boolean>,
): void {
	const painter = new TRootPainter(paint)

	effect(() => {
		const node = target()

		if (node) painter.paint(node, drawn(), hidden !== undefined && hidden())
	})
}

/** Спутник слоя (подложка) прячется тем же значением, что корень. */
export function hideCompanion(companion: TNode, hidden: Signal<boolean>): void {
	paintOn(companion, NO_APPLIED_STYLES, (node, applied) =>
		applyStyles(node, hidden() ? COMPANION_HIDDEN : COMPANION_SHOWN, applied),
	)
}
