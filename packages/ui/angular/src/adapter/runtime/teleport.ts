/**
 * teleportRoot — телепорт корня-хоста: аналог `<teleport :to>` Vue и
 * `Teleport` React, Svelte и Solid. Уводит корень в цель по селектору, из-под
 * `overflow` и контекстов наложения предков, — так Frame уводит панель в
 * `body`.
 *
 * Корень в Angular — элемент, который написал потребитель (`<div so-frame>`,
 * см. `TComponentBase`), и в цель уезжает сам этот элемент: класс, атрибуты и
 * обработчики потребителя остаются на панели без проброса, как на корне в
 * остальных адаптерах. Своей отрисовки у телепорта нет — Angular ведёт
 * элемент по ссылке, где бы тот ни стоял: привязки, содержимое, контексты DI
 * места (локаль провайдера вокруг Frame).
 *
 * - Переносит только в браузере и после отрисовки — эффектом после отрисовки
 *   (`afterRenderEffect`), которого на сервере нет. Гидратация ищет узел там,
 *   где его нарисовал сервер, поэтому до неё узел на месте. Первый прогон
 *   эффекта — после первой отрисовки, следующие — смена цели или «на месте».
 * - Пока узел в цели, на его месте стоит якорь-комментарий: узел меняется с
 *   ним местами, и соседи на месте считают те же узлы, что нарисовал сервер.
 *   «На месте» (`contained` у Frame) или без цели узел возвращается к якорю, и
 *   якорь уходит из разметки; снова в цель — снова с якорем.
 * - Смена цели переносит тот же узел в новую цель.
 * - Снят компонент — убираются якорь и узел из цели. Узел — корень
 *   представления Angular снимает сам и из цели (`removeChild` рендерера — это
 *   `el.remove()`), но узел, вложенный в снятый элемент, он не трогает: тот
 *   остался бы в цели.
 *
 * Отдаёт сигнал «корень там, где ему место»: на месте, если так задано, или в
 * цели. Пока он ложь — на сервере, до переноса, без цели, — база корень
 * прячет: панель, которой место в слое, на месте не показывается.
 */

import { DestroyRef, afterRenderEffect, computed, inject, signal, type Signal } from '@angular/core'

/** Куда корню: селектор цели и «на месте» — значения состояния компонента. */
export type TTeleportPlace = {
	/** Селектор цели: `body`, `#layers`. `null` — цели нет. */
	readonly target: Signal<string | null>
	/** Корень остаётся на месте, без переноса (`contained` у Frame). */
	readonly contained: Signal<boolean>
}

/** Текст якоря, который стоит на месте корня, пока корень в цели. */
export const TELEPORT_ANCHOR = 'so-teleport'

/**
 * Переносит корень `root` по `place`. Зовётся в контексте инъекции
 * компонента: эффекту после отрисовки и снятию нужен его инжектор.
 */
export function teleportRoot(root: Element, place: TTeleportPlace): Signal<boolean> {
	/** Корень в цели. Пишет его только перенос — в браузере, после отрисовки. */
	const moved = signal(false)

	/** Якорь на месте корня, пока корень в цели; корень на месте — якоря нет. */
	let anchor: Comment | null = null

	/** Корень уходит в цель, на его место встаёт якорь. */
	const moveTo = (target: Element): void => {
		if (anchor === null) {
			anchor = root.ownerDocument.createComment(TELEPORT_ANCHOR)
			// Места нет (корень вне документа) — якорь остаётся вне документа
			root.replaceWith(anchor)
		}

		if (root.parentNode !== target) target.appendChild(root)
	}

	/** Корень возвращается к якорю, якорь уходит. */
	const moveHome = (): void => {
		if (anchor === null) return

		// Места у корня не было — на месте ему быть негде
		if (anchor.parentNode) anchor.replaceWith(root)
		else root.remove()

		anchor = null
	}

	// Фаза записи: эффект меняет DOM, а раскладку не читает
	afterRenderEffect({
		write: () => {
			const selector = place.contained() ? null : place.target()
			const target = selector === null ? null : root.ownerDocument.querySelector(selector)

			if (target) moveTo(target)
			else moveHome()

			moved.set(target !== null)
		},
	})

	inject(DestroyRef).onDestroy(() => {
		if (anchor === null) return

		anchor.remove()
		root.remove()
		anchor = null
	})

	return computed(() => place.contained() || moved())
}
