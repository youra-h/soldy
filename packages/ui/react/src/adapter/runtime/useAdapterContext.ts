/**
 * useAdapterContext — держит adapter-context между рендерами и отвечает за
 * весь срок его жизни (аналог того, что во Vue делает `setup()`, вызываемый
 * один раз за жизнь компонента).
 *
 * Компонент передаёт фабрику (обычно `(create) => create(XDescriptor(), ...)`),
 * хук вызывает её при первом рендере и на следующих отдаёт то же самое.
 * Фабрика может вернуть и несколько контекстов — у коллекции это свой и
 * фасада (`[adapter, collection]`): фасад собран на инстансе и наборе
 * владельца, поэтому живут они одной единицей — хук держит, пересобирает и
 * уничтожает их вместе, уничтожает — в обратном порядке.
 *
 * Собирает фабрика функцией `create`, которую даёт хук, а не
 * `createAdapterContext` напрямую: `create` — та же сборка с id монтирования
 * (`mountId`) от `useId`, от него плагины строят `id` частей. Счётчик
 * процесса на сервере общий для всех запросов, и `id` от него расходились бы
 * при гидратации, а `useId` React выводит из места компонента в дереве. Id
 * монтирования один у всех контекстов компонента, в том числе
 * пересобранного: место в дереве то же. Фасад коллекции делит набор
 * владельца, и id монтирования у него владельца.
 * Держим через `useRef`, а не `useState` или `useMemo`: их инициализатор React
 * 19 под StrictMode зовёт дважды, и второй контекст с живым набором плагинов
 * утёк бы, а кэш `useMemo` React вправе сбросить.
 *
 * Вторым аргументом фабрика получает лифт компонента (`elevator`): `up()`
 * читает слой, который компонент увидел на рендере, `down()` пишет в слой
 * компонента. Этот слой хук возвращает (`layer`), а детям его отдаёт `Elevate`.
 * Хук помнит, что сборка прочла через `up()`. Сменилось это на рендере —
 * например, владелец коллекции пересобран, и движок у него новый, — компонент
 * собирается заново тем же путём, что при повторной установке эффекта.
 *
 * Уничтожает контексты очистка эффекта. React вправе заново установить эффекты
 * того же компонента: StrictMode делает лишний цикл при монтировании,
 * `<Activity>` — при показе. Компонент при этом жив, а его контексты уже
 * уничтожены, поэтому на такой установке хук собирает их заново и
 * перерисовывает компонент с ними. Фабрика — из последнего рендера: пропсы
 * первого с тех пор могли смениться. Без `ctrl` инстанс у нового контекста
 * новый, с `ctrl` — тот же. Каждый контекст уничтожается ровно один раз, в том
 * числе собранный, но так и не отрисованный, если компонент размонтировали до
 * перерисовки.
 *
 * Принимает контексты (`attach()`) тот же эффект, что их уничтожает, — после
 * сборки и каждой пересборки. Для React компонент принят при коммите, а не на
 * рендере: отброшенный рендер не должен трогать ничего чужого, и элемент
 * коллекции поэтому входит в неё только здесь. Эффекты детей идут раньше
 * родителя и в порядке документа, поэтому элементы разметки входят в
 * коллекцию в порядке DOM.
 *
 * Отброшенный рендер React ничем не объявляет, и сборку, которую он выбросил,
 * освобождает `TDrafts`: хук отдаёт ему каждую сборку, пока её не приняли.
 *
 * Выходы плагинов из типа контекста хук сохраняет: по ним `useAdapter` типизирует
 * `state`, и потерянные здесь они не дошли бы до разметки.
 */

import { useContext, useEffect, useEffectEvent, useId, useMemo, useReducer, useRef } from 'react'
import { createAdapterContext } from '@soldy-ui/setup'
import type { IAdapterContext, TElevatorFactory } from '@soldy-ui/setup'
import { ElevatorContext, type TElevatorLayer } from '../elevator/layer'
import { TReactElevatorScope } from '../elevator/scope.class'
import { TDrafts } from './drafts.class'

/** Сборка контекста, которую хук отдаёт фабрике: сигнатура — `createAdapterContext`. */
export type TCreateAdapterContext = typeof createAdapterContext

/** Что собирает фабрика: контекст компонента или несколько — свой и фасада коллекции. */
export type TAdapterContexts = IAdapterContext | readonly IAdapterContext[]

/** Результат хука: контексты из фабрики и слой лифта, который компонент отдаёт детям. */
export type TAssembly<T extends TAdapterContexts> = {
	/** Ровно то, что вернула фабрика. */
	readonly contexts: T
	/** Слой компонента: родительский и то, что сборка опустила. Детям — через `Elevate`. */
	readonly layer: TElevatorLayer
}

/** Сборка на руках у хука: контексты, лифт, на котором они собраны, и что они взяли снаружи. */
type TBuilt<T extends TAdapterContexts> = {
	readonly contexts: T
	readonly scope: TReactElevatorScope
	/** `ctrl` и движок коллекции, пришедшие снаружи: их держит одно монтирование. */
	readonly held: readonly object[]
}

/** Счётчик версий: его смена перерисовывает компонент с новыми контекстами. */
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

/** В обратном порядке: фасад уходит раньше владельца. */
function destroyAll(contexts: TAdapterContexts): void {
	for (const context of [...listOf(contexts)].reverse()) context.destroy()
}

export function useAdapterContext<T extends TAdapterContexts>(
	factory: (create: TCreateAdapterContext, elevator: TElevatorFactory) => T,
): TAssembly<T> {
	const mountId = useId()
	// Слой, который компонент увидел на рендере: из него сборка читает `up()`
	const parent = useContext(ElevatorContext)
	const ref = useRef<TBuilt<T> | null>(null)
	// Контексты в `ref` уничтожены очисткой эффекта; признак — хука, не контекста
	const destroyed = useRef(false)
	// С чем прошла последняя установка эффекта: сменить его может только
	// устаревшее прочитанное
	const settled = useRef<TElevatorLayer | null>(null)
	const [, rerender] = useReducer(nextVersion, 0)
	const assemble = (layer: TElevatorLayer): TBuilt<T> => {
		const scope = new TReactElevatorScope(layer)
		const held: object[] = []
		// Id монтирования, заданный опцией явно, остаётся за тем, кто его задал
		const create: TCreateAdapterContext = (descriptor, options, config) => {
			held.push(...drafts.take(options))

			return createAdapterContext(descriptor, { mountId, ...options }, config)
		}
		const contexts = factory(create, scope.elevator)

		drafts.add(held, () => destroyAll(contexts))

		return { contexts, scope, held }
	}
	// Эффект зовёт фабрику последнего рендера, а не той, что застал при установке
	const rebuild = useEffectEvent(() => assemble(parent))

	if (!ref.current) {
		ref.current = assemble(parent)
	}

	const built = ref.current
	// Прочитанное сборкой сменилось — эффект переустановится с новым слоем, а
	// пока нет — остаётся тем, с чем установлен: пересобранные в эффекте
	// контексты его не трогают
	const source = built.scope.isStale(parent) ? parent : settled.current

	useEffect(() => {
		settled.current = source

		// Повторная установка: после очистки (StrictMode, `<Activity>`) или
		// из-за устаревшего прочитанного. Компонент жив, а его контекстов нет
		if (destroyed.current) {
			ref.current = rebuild()
			destroyed.current = false
			rerender()
		}

		const current = ref.current

		if (current) {
			drafts.accept(current.held)
			attachAll(current.contexts)
		}

		return () => {
			if (current) destroyAll(current.contexts)

			destroyed.current = true
		}
	}, [source])

	const layer = useMemo(() => built.scope.layerOver(parent), [built, parent])

	return { contexts: built.contexts, layer }
}
