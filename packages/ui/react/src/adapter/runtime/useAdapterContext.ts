/**
 * useAdapterContext — держит adapter-context между рендерами и отвечает за
 * весь срок его жизни (аналог того, что во Vue делает `setup()`, вызываемый
 * один раз за жизнь компонента).
 *
 * Компонент передаёт фабрику (обычно `(create) => create(XDescriptor(), ...)`),
 * хук вызывает её при первом рендере и на следующих отдаёт тот же объект.
 *
 * Собирает фабрика функцией `create`, которую даёт хук, а не
 * `createAdapterContext` напрямую: `create` — та же сборка с основой `id`
 * экземпляра (`idBase`) от `useId`. Счётчик ядра (`uid`) на сервере общий
 * для всех запросов, и `id` от него расходились при гидратации, а `useId`
 * React выводит из места компонента в дереве. Основа одна у всех контекстов
 * компонента, в том числе пересобранного: место в дереве то же.
 * Держим через `useRef`, а не `useState` или `useMemo`: их инициализатор React
 * 19 под StrictMode зовёт дважды, и второй контекст с живым набором плагинов
 * утёк бы, а кэш `useMemo` React вправе сбросить.
 *
 * Уничтожает контекст очистка эффекта. React вправе заново установить эффекты
 * того же компонента: StrictMode делает лишний цикл при монтировании,
 * `<Activity>` — при показе. Компонент при этом жив, а его контекст уже
 * уничтожен, поэтому на такой установке хук собирает контекст заново и
 * перерисовывает компонент с ним. Фабрика — из последнего рендера: пропсы
 * первого с тех пор могли смениться. Без `ctrl` инстанс у нового контекста
 * новый, с `ctrl` — тот же. Каждый контекст уничтожается ровно один раз, в том
 * числе собранный, но так и не отрисованный, если компонент размонтировали до
 * перерисовки.
 *
 * Выходы плагинов из типа контекста хук сохраняет: по ним `useAdapter` типизирует
 * `state`, и потерянные здесь они не дошли бы до разметки.
 */

import { useEffect, useEffectEvent, useId, useReducer, useRef } from 'react'
import { createAdapterContext } from '@soldy-ui/setup'
import type { IAdapterContext, IComponentContract } from '@soldy-ui/setup'

/** Сборка контекста, которую хук отдаёт фабрике: сигнатура — `createAdapterContext`. */
export type TCreateAdapterContext = typeof createAdapterContext

/** Счётчик версий: его смена перерисовывает компонент с новым контекстом. */
const nextVersion = (version: number) => version + 1

export function useAdapterContext<C extends IComponentContract>(
	factory: (create: TCreateAdapterContext) => IAdapterContext<C>,
): IAdapterContext<C> {
	const idBase = useId()
	const ref = useRef<IAdapterContext<C> | null>(null)
	// Контекст в `ref` уничтожен очисткой эффекта; признак — хука, не контекста
	const destroyed = useRef(false)
	const [, rerender] = useReducer(nextVersion, 0)
	// Основа, заданная опцией явно, остаётся за тем, кто её задал
	const create: TCreateAdapterContext = (descriptor, options, config) =>
		createAdapterContext(
			descriptor,
			{ ...options, options: { idBase, ...options.options } },
			config,
		)
	// Эффект зовёт фабрику последнего рендера, а не той, что застал при установке
	const rebuild = useEffectEvent(() => factory(create))

	if (!ref.current) {
		ref.current = factory(create)
	}

	useEffect(() => {
		// Повторная установка после очистки: компонент жив, а его контекст нет
		if (destroyed.current) {
			ref.current = rebuild()
			destroyed.current = false
			rerender()
		}

		return () => {
			ref.current?.destroy()
			destroyed.current = true
		}
	}, [])

	return ref.current
}
