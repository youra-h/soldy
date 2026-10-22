/**
 * TDrafts — сборки, которые React ещё не принял, и освобождение тех, что он отбросил.
 *
 * React собирает компонент на рендере, а рендер вправе выбросить, ничего не
 * сообщив: сосед в той же группе `Suspense` ждёт данных, рендер прервали. У
 * выброшенной сборки нет ни эффекта, ни очистки, а её плагины уже подписаны на
 * то, что пришло снаружи, — `ctrl` и движок коллекции. Те живут дольше сборки
 * и держали бы её обработчики — по набору на каждый повтор рендера.
 *
 * Это фаза сборки правила, которое у принятых монтирований держит привязка
 * владельца к движку: новое монтирование забирает своё у прежнего. Сборка,
 * пока её не приняли, помнится по тому, что взяла снаружи, и следующая сборка
 * того же `ctrl` или движка сначала уничтожает непринятую — до своих плагинов:
 * снятое прежними не сотрёт записанное новыми. Принятую сборку отсюда не
 * уничтожают: её снимет очистка эффекта, а привязку владельца передают
 * держатели в ядре (`bindOwner` и `releaseOwner` фасада). Черновик держателем
 * не становится — привязка идёт только на приёме.
 *
 * Опирается это на договор «один `ctrl` — один компонент», но не на его
 * проверку: и два живых компонента на одном движке не текут. Черновик,
 * который уничтожил сосед, пересобирает эффект хука, и на каждый живой
 * компонент остаётся одна сборка.
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

type TDraft = {
	readonly held: readonly object[]
	readonly destroy: () => void
	/** Id монтирования, с которым черновик собран: его `id` уже лежат в `ctrl`. */
	readonly mountId: string
}

/** Что сборка взяла снаружи и id монтирования выброшенного черновика того же `ctrl`, если он был. */
export type TTaken = { readonly held: object[]; readonly mountId?: string }

export class TDrafts {
	/** Непринятые сборки — по каждому объекту, который они взяли снаружи. */
	private readonly _drafts = new WeakMap<object, TDraft>()

	/**
	 * Что сборка контекста берёт снаружи: `ctrl` и движок фасада коллекции
	 * (опция `engine`). Непринятую сборку, взявшую то же, React отбросил — она
	 * уничтожается здесь.
	 *
	 * Сборка на месте выброшенной над тем же `ctrl` — повтор того же рендера:
	 * она берёт id монтирования выброшенной. `useId` на повторе отдаёт новый, и
	 * плагины связок писали бы в `ctrl` новые `id` на каждый повтор, а прежнее
	 * монтирование `ctrl`, ещё живое, перерисовывалось бы от каждого — и его
	 * перерисовка снова повторяет рендер `Suspense`, без конца. Движок без
	 * `ctrl` id не передаёт: компоненты на нём пишут `id` каждый в свой
	 * инстанс, а два живых компонента на одном движке законны и id делить не
	 * должны.
	 */
	take(options: IAdapterContextOptions): TTaken {
		const engine: unknown = options.options ? Reflect.get(options.options, 'engine') : undefined
		const held = [options.ctrl, engine].filter(isObject)
		const mountId = options.ctrl ? this._drafts.get(options.ctrl)?.mountId : undefined

		for (const value of held) this._discard(value)

		return { held, mountId }
	}

	/** Собранное — черновик, пока его не приняли. */
	add(held: readonly object[], destroy: () => void, mountId: string): void {
		const draft = { held, destroy, mountId }

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
