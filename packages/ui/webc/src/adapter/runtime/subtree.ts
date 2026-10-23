/**
 * Признак «поддерево есть» в контексте места. У Vue `v-if` снимает и панели
 * вложенных слоёв, увезённые в `body`, а `display: none` элемента до них не
 * доходит, поэтому снятое поддерево элемент отдаёт месту признаком. Смена
 * доходит до подписчиков тем же вызовом. AGENTS.md (Web Components),
 * «Поддерево».
 */

import { TPlaceContext } from '../context'

export class TSubtree {
	private _present = true
	private readonly _listeners = new Set<() => void>()

	get present(): boolean {
		return this._present
	}

	set present(value: boolean) {
		if (value === this._present) return

		this._present = value

		// Копия: подписчик, которого смена сняла, остальных не сбивает
		for (const listener of [...this._listeners]) listener()
	}

	subscribe(listener: () => void): () => void {
		this._listeners.add(listener)

		return () => {
			this._listeners.delete(listener)
		}
	}
}

/** Признак предка по месту на одну сборку; предка нет — поддерево есть. */
export type TAbove = {
	readonly present: boolean
	stop(): void
}

const SUBTREE = new TPlaceContext<TSubtree>()

export function provideSubtree(element: Element, subtree: TSubtree): void {
	SUBTREE.provide(element, subtree)
}

/** Ближайший признак выше по месту — от якоря у увезённого корня — и подписка на него. */
export function followAbove(node: Node, listener: () => void): TAbove {
	const above = SUBTREE.nearest(node)
	const unsubscribe = above?.subscribe(listener)

	return {
		get present() {
			return above?.present ?? true
		},
		stop: () => unsubscribe?.(),
	}
}
