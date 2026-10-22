/**
 * Эффекты раскладки ядра на корень: классы, наборы слоями `TElementAttributes`,
 * выходы плагинов и стиль. Корень бывает узлом шаблона, которого до отрисовки
 * нет и который бывает новым: на новом узле память раскладки пуста, и первая
 * раскладка пишет всё.
 */

import { computed, effect, signal, type Signal } from '@angular/core'
import type { TStateSnapshot } from '@soldy-ui/setup'
import {
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

const ROOT_SETS: readonly TRootSet[] = ['attrs', 'aria', 'dataset']
const NO_APPLIED_CLASSES: TAppliedClasses = new Set()
export const NO_APPLIED_STYLES: TAppliedStyles = new Map()
/** Верхний слой стиля корня, которого прячет стиль, а не привязка хоста. */
const HIDDEN_ROOT: object = Object.freeze({ display: 'none' })
const NEVER_HIDDEN: Signal<boolean> = signal(false).asReadonly()
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

/**
 * Раскладка `drawn` на корень `target()`. `hidden` — у корня, которого прячет
 * его стиль (регион тостов): скрытый получает `display: none` верхним слоем.
 */
export function paintRoot(
	target: TNode,
	paint: TRootPaint,
	drawn: Signal<TStateSnapshot>,
	hidden: Signal<boolean> = NEVER_HIDDEN,
): void {
	const classes = computed(() => classesOf(drawn()['classes']))

	paintOn(target, NO_APPLIED_CLASSES, (node, applied) => applyClasses(node, classes(), applied))

	const sets = paint.sets ?? ROOT_SETS

	for (const name of ROOT_SETS) {
		const layer = rootLayer(name, paint, sets, drawn)

		if (layer) onNode(target, (node) => TElementAttributes.of(node).set(name, layer()))
	}

	if (paint.plugins) {
		const outputs = paint.plugins.map((name) => computed(() => attributesOf(drawn()[name])))

		onNode(target, (node) => {
			const layer: Record<string, unknown> = {}

			for (const output of outputs) Object.assign(layer, output())

			TElementAttributes.of(node).set('plugins', layer)
		})
	}

	// Значения состояния — как есть: связка заменяет их только на смену
	// содержимого, и эффект не будит смена чужих свойств
	const style = paint.style
	const layout = computed(() => drawn()['layout_styles'])
	const own = computed(() => (style === undefined ? undefined : drawn()[style]))
	const order = computed(() => (paint.order ? drawn()['order'] : undefined))

	paintOn(target, NO_APPLIED_STYLES, (node, applied) =>
		applyStyles(
			node,
			stylesOf(
				layout(),
				own(),
				orderOf(paint.order, order()),
				hidden() ? HIDDEN_ROOT : undefined,
			),
			applied,
		),
	)
}

/**
 * Слой `name` корня: набор ядра, если описание кладёт его на корень (`sets`), а
 * в слое `attrs` под набором — `id` корня (у Vue `:id` стоит перед `v-bind`).
 */
function rootLayer(
	name: TRootSet,
	paint: TRootPaint,
	sets: readonly TRootSet[],
	drawn: Signal<TStateSnapshot>,
): Signal<object> | null {
	const output = name === 'aria' ? (paint.aria ?? 'aria') : name
	const own = sets.includes(name) ? computed(() => attributesOf(drawn()[output])) : null
	const idOutput = name === 'attrs' ? paint.id : undefined

	if (idOutput === undefined) return own

	const id = computed(() => drawn()[idOutput])

	return computed(() => ({ id: id(), ...own?.() }))
}

/** Спутник слоя (подложка) прячется тем же значением, что корень. */
export function hideCompanion(companion: TNode, hidden: Signal<boolean>): void {
	paintOn(companion, NO_APPLIED_STYLES, (node, applied) =>
		applyStyles(node, hidden() ? COMPANION_HIDDEN : COMPANION_SHOWN, applied),
	)
}
