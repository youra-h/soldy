/**
 * teleportRoot — телепорт корня, аналог `<teleport :to>` Vue. В цель уезжает
 * сам узел, на его месте стоит якорь-комментарий; Angular ведёт узел по ссылке,
 * где бы тот ни стоял. AGENTS.md (Angular), «Слой уезжает в цель сам» и «Слой
 * есть только в браузере».
 *
 * - Только в браузере, после отрисовки: гидратация ищет узел там, где его
 *   нарисовал сервер.
 * - Angular переставляет узлы своих представлений, не зная о переносе, поэтому
 *   после каждой отрисовки перенос сверяет, где узел на самом деле.
 * - Спутник (подложка) — всегда прямо перед корнем.
 * - Сверка не спасает от NG05106: `@for` вставляет узлы перед увезённым
 *   корнем, и рендерер бросает раньше любого хука. Обход — обёртка вокруг Frame.
 *
 * Отдаёт «корень на своём месте»: пока ложь, слоя нет.
 */

import {
	DOCUMENT,
	DestroyRef,
	afterEveryRender,
	afterRenderEffect,
	inject,
	signal,
	untracked,
	type Signal,
} from '@angular/core'

export type TTeleportPlace = {
	/** Селектор цели; `null` — цели нет. */
	readonly target: Signal<string | null>
	/** Корень остаётся на месте (`contained` у Frame и Drawer). */
	readonly contained: Signal<boolean>
}

export const TELEPORT_ANCHOR = 'so-teleport'

type TAway = {
	readonly node: Element
	readonly anchor: Comment
	readonly target: Element
}

const NO_COMPANION = (): Element | null => null

/** Зовётся в контексте инъекции компонента. */
export function teleportRoot(
	root: () => Element | null,
	place: TTeleportPlace,
	companion: () => Element | null = NO_COMPANION,
): Signal<boolean> {
	const placed = signal(false)
	const document = inject(DOCUMENT)

	/** Цель по селектору; `null` — корню место на месте. */
	let wanted: Element | null = null
	let away: TAway | null = null

	/** Только для корня в документе: якорю есть где встать. */
	const moveTo = (node: Element, target: Element): void => {
		let anchor = away?.anchor

		if (anchor === undefined) {
			anchor = document.createComment(TELEPORT_ANCHOR)
			node.replaceWith(anchor)
		}

		target.appendChild(node)
		away = { node, anchor, target }
	}

	// Узлы читаются без слежения: новый появляется отрисовкой, после которой
	// сверка идёт всё равно
	const escort = (node: Element): void => {
		const escorted = untracked(companion)

		if (escorted === null) return

		const parent = node.parentNode

		if (parent === null) escorted.remove()
		else if (escorted.nextSibling !== node) parent.insertBefore(escorted, node)
	}

	const settle = (): void => {
		const node = untracked(root)

		if (away !== null && (away.node !== node || node.parentNode !== away.target)) {
			// Angular вынул корень из цели, вставил обратно или нарисовал новый
			away.anchor.remove()
			away = null
		} else if (away !== null && !away.anchor.isConnected) {
			// Место ушло из документа вместе с предком — корень уходит с ним
			if (away.anchor.parentNode) away.anchor.replaceWith(away.node)
			else away.node.remove()

			away = null
		}

		if (node === null) return

		if (wanted === null) {
			if (away !== null) {
				away.anchor.replaceWith(away.node)
				away = null
			}
		}
		// Корень вне документа ждёт, пока Angular его вставит
		else if (node.parentNode !== wanted && node.isConnected) moveTo(node, wanted)

		escort(node)
	}

	// Цель ищется по селектору только на смену цели или «на месте»
	afterRenderEffect({
		write: () => {
			const contained = place.contained()
			const selector = contained ? null : place.target()

			wanted = selector === null ? null : document.querySelector(selector)
			placed.set(contained || wanted !== null)
			settle()
		},
	})

	// Место узла Angular меняет и из чужого представления (проекция, `@for`)
	afterEveryRender({ write: settle })

	inject(DestroyRef).onDestroy(() => {
		// Спутник стоит рядом с корнем, снятие компонента его не убирает
		untracked(companion)?.remove()

		if (away === null) return

		away.anchor.remove()
		away.node.remove()
		away = null
	})

	return placed.asReadonly()
}
