/**
 * TEventRelay — подписки на события владельцев без повторов, снимаемые разом.
 *
 * Один и тот же сигнал компонент объявляет несколько раз: триггер
 * `change:visible` есть и у `visible`, и у `present`, а событие плагина может
 * совпасть с триггером его пропа. Пересылай его каждый объявивший — получатель
 * видел бы два события на одно изменение. Повтор — пара «источник, имя»:
 * первая подписка на неё остаётся, остальные пропускаются.
 *
 * Без повторов пересылают только события. Состоянию повтор нужен: каждое
 * свойство перечитывает себя на свой триггер (`TProperty.watch`).
 */

import type { IEventSource } from '@soldy/core'

export class TEventRelay {
	private readonly _offs: Array<() => void> = []
	private readonly _seen = new Map<IEventSource, Set<string>>()

	/** Слушать событие источника; повторная подписка на ту же пару пропускается. */
	listen(source: IEventSource, name: string, handler: (...args: unknown[]) => void): void {
		let names = this._seen.get(source)

		if (!names) {
			names = new Set()
			this._seen.set(source, names)
		}

		if (names.has(name)) return

		names.add(name)
		source.on(name, handler)
		this._offs.push(() => source.off(name, handler))
	}

	/** Снять вместе со своими подписками и чужую — отпиской, которую она вернула. */
	add(off: () => void): void {
		this._offs.push(off)
	}

	stop(): void {
		for (const off of this._offs.splice(0)) off()

		this._seen.clear()
	}
}
