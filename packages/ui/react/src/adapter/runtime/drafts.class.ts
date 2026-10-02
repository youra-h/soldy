/**
 * TDrafts — сборки, которые React ещё не принял, и освобождение тех, что он отбросил.
 *
 * React собирает компонент на рендере, а рендер вправе выбросить, ничего не
 * сообщив: сосед в той же группе `Suspense` ждёт данных, рендер прервали. У
 * выброшенной сборки нет ни эффекта, ни очистки, а её плагины уже подписаны на
 * то, что пришло снаружи, — `ctrl` и движок коллекции. Те живут дольше сборки
 * и держали бы её обработчики — по набору на каждый повтор рендера.
 *
 * Один `ctrl` — один компонент, один движок — один компонент. Поэтому сборка,
 * пока её не приняли, помнится по тому, что взяла снаружи, и следующая сборка
 * того же `ctrl` или движка сначала уничтожает непринятую — до своих плагинов:
 * снятое прежними не сотрёт записанное новыми.
 *
 * Сборка, отброшенная без следующей (переход бросили, и компонента в дереве
 * больше нет), живёт до следующей сборки этого `ctrl` или движка или пока
 * приложение держит их сами — одна, а не по одной на каждый повтор.
 *
 * Порядок для хука — три шага:
 *
 * 1. `take(options)` на каждый собираемый контекст — до сборки: уничтожает
 *    непринятую сборку с тем же `ctrl` или движком и отдаёт взятое;
 * 2. `add(held, destroy)` — собранное с тем, что взято, — черновик;
 * 3. `accept(held)` при коммите — сборка принята и больше не черновик.
 */

import type { IAdapterContextOptions } from '@soldy-ui/setup'

function isObject(value: unknown): value is object {
	return typeof value === 'object' && value !== null
}

export class TDrafts {
	/** Непринятые сборки — по каждому объекту, который они взяли снаружи. */
	private readonly _drafts = new WeakMap<
		object,
		{ readonly held: readonly object[]; readonly destroy: () => void }
	>()

	/**
	 * Что сборка контекста берёт снаружи: `ctrl` и движок фасада коллекции
	 * (опция `engine`). Непринятую сборку, взявшую то же, React отбросил — она
	 * уничтожается здесь.
	 */
	take(options: IAdapterContextOptions): object[] {
		const engine: unknown = options.options ? Reflect.get(options.options, 'engine') : undefined
		const held = [options.ctrl, engine].filter(isObject)

		for (const value of held) this._discard(value)

		return held
	}

	/** Собранное — черновик, пока его не приняли. */
	add(held: readonly object[], destroy: () => void): void {
		const draft = { held, destroy }

		for (const value of held) this._drafts.set(value, draft)
	}

	/** Сборка принята: больше не черновик. */
	accept(held: readonly object[]): void {
		this._forget(held)
	}

	/** Непринятую сборку, взявшую этот объект, React отбросил: её место занимает новая. */
	private _discard(value: object): void {
		const draft = this._drafts.get(value)

		if (draft === undefined) return

		this._forget(draft.held)
		draft.destroy()
	}

	private _forget(held: readonly object[]): void {
		for (const value of held) {
			if (this._drafts.get(value)?.held === held) this._drafts.delete(value)
		}
	}
}
