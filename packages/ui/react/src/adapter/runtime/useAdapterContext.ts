/**
 * useAdapterContext — keeps the component's contexts between renders and
 * answers for their whole life: the assembly on the first render, the
 * acceptance at the commit, the reassembly when the effect is set again, the
 * detach and the destruction by the cleanups.
 * AGENTS.md (React), «Срок жизни контекста».
 */

import {
	useContext,
	useEffect,
	useEffectEvent,
	useId,
	useLayoutEffect,
	useMemo,
	useReducer,
	useRef,
} from 'react'
import { createAdapterContext } from '@soldy-ui/setup'
import type { IAdapterContext, TElevatorFactory } from '@soldy-ui/setup'
import { ElevatorContext, type TElevatorLayer } from '../elevator/layer'
import { LocaleContext } from '../locale/context'
import { TReactElevatorScope } from '../elevator/scope.class'
import { TDrafts } from './drafts.class'
import { accepting } from './accepting'

/** Сборка контекста, которую хук отдаёт фабрике: сигнатура — `createAdapterContext`. */
export type TCreateAdapterContext = typeof createAdapterContext

/** Что собирает фабрика: контекст компонента или несколько — свой и фасада коллекции. */
export type TAdapterContexts = IAdapterContext | readonly IAdapterContext[]

export type TAssembly<T extends TAdapterContexts> = {
	/** Ровно то, что вернула фабрика. */
	readonly contexts: T
	/** Слой компонента: родительский и то, что сборка опустила. Детям — через `Elevate`. */
	readonly layer: TElevatorLayer
}

const nextVersion = (version: number) => version + 1

/** Сборки, которые React ещё не принял, — общие для всех компонентов. */
const drafts = new TDrafts()

function isList(contexts: TAdapterContexts): contexts is readonly IAdapterContext[] {
	return Array.isArray(contexts)
}

function listOf(contexts: TAdapterContexts): readonly IAdapterContext[] {
	return isList(contexts) ? contexts : [contexts]
}

/** В порядке сборки: фасад собран на наборе владельца и принимается после него. */
function attachAll(contexts: TAdapterContexts): void {
	for (const context of listOf(contexts)) context.attach()
}

/** All of them before any goes: the component's consumer hears nothing of its facade leaving. */
function detachAll(contexts: TAdapterContexts): void {
	for (const context of listOf(contexts)) context.detach()
}

/** Detached, then in reverse order: the facade goes before the owner. */
function destroyAll(contexts: TAdapterContexts): void {
	detachAll(contexts)

	for (const context of [...listOf(contexts)].reverse()) context.destroy()
}

/**
 * Сборка на руках у хука: контексты, лифт и то, что они взяли снаружи.
 * Очистка эффекта — стрелка `destroy`: AGENTS.md (React), «Функции дольше
 * рендера — в классах».
 */
class TBuilt<T extends TAdapterContexts> {
	private _destroyed = false

	/**
	 * @param contexts ровно то, что вернула фабрика
	 * @param scope лифт, на котором собраны контексты
	 * @param held `ctrl` и движок коллекции, пришедшие снаружи
	 */
	constructor(
		readonly contexts: T,
		readonly scope: TReactElevatorScope,
		readonly held: readonly object[],
	) {}

	get destroyed(): boolean {
		return this._destroyed
	}

	/**
	 * The consumers of the contexts being accepted hear nothing of what the
	 * acceptance writes — an item entering its collection: that is the starting
	 * state, as in the other adapters, where the consumer listens after the
	 * acceptance. React accepts in a passive effect, after the consumer
	 * listens (a layout effect, so as not to miss `ready` of a frame before
	 * it), and the children before the owner, who has to hear them enter.
	 */
	accept(): void {
		drafts.accept(this.held)
		accepting(this.contexts, () => attachAll(this.contexts))
	}

	/** The cleanup of a layout effect: the teardown's first moment, before any destruction. */
	readonly detach = (): void => {
		detachAll(this.contexts)
	}

	readonly destroy = (): void => {
		destroyAll(this.contexts)
		this._destroyed = true
	}
}

export function useAdapterContext<T extends TAdapterContexts>(
	factory: (create: TCreateAdapterContext, elevator: TElevatorFactory) => T,
): TAssembly<T> {
	const mountId = useId()
	const locale = useContext(LocaleContext)
	const parent = useContext(ElevatorContext)
	const ref = useRef<TBuilt<T> | null>(null)
	// С чем прошла последняя установка эффекта
	const settled = useRef<TElevatorLayer | null>(null)
	const [, rerender] = useReducer(nextVersion, 0)
	const assemble = (layer: TElevatorLayer): TBuilt<T> => {
		const scope = new TReactElevatorScope(layer)
		const held: object[] = []
		// Повтор выброшенного рендера над тем же `ctrl` — с id выброшенного
		let id = mountId
		// Id монтирования и локаль, заданные опцией явно, остаются за тем, кто
		// их задал
		const create: TCreateAdapterContext = (descriptor, options, config) => {
			const taken = drafts.take(options)

			held.push(...taken.held)
			id = taken.mountId ?? id

			return createAdapterContext(descriptor, { mountId: id, locale, ...options }, config)
		}
		const built = new TBuilt(factory(create, scope.elevator), scope, held)

		drafts.add(held, built.destroy, id)

		return built
	}
	// Фабрика последнего рендера, а не той, что застал эффект
	const rebuild = useEffectEvent(() => assemble(parent))

	if (!ref.current) {
		ref.current = assemble(parent)
	}

	const built = ref.current
	// Устаревшее прочитанное переустанавливает эффект с новым слоем
	const source = built.scope.isStale(parent) ? parent : settled.current

	useEffect(() => {
		settled.current = source

		// Повторная установка: компонент жив, а его контексты уничтожены
		if (ref.current?.destroyed) {
			ref.current = rebuild()
			rerender()
		}

		const current = ref.current

		if (!current) return

		current.accept()

		return current.destroy
	}, [source])

	// Detached by a layout cleanup: every layout cleanup of a removed subtree
	// comes before any passive one, so the consumers hear nothing once the
	// teardown began, and the destruction — the passive cleanup above — comes
	// after all of them
	useLayoutEffect(() => built.detach, [built])

	const layer = useMemo(() => built.scope.layerOver(parent), [built, parent])

	return { contexts: built.contexts, layer }
}
