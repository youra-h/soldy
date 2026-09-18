/**
 * useAdapterContext — держит adapter-context между рендерами и отвечает за
 * весь срок его жизни (аналог того, что во Vue делает `setup()`, вызываемый
 * один раз за жизнь компонента).
 *
 * Компонент передаёт фабрику (обычно `() => createAdapterContext(XDescriptor(), ...)`),
 * хук вызывает её при первом рендере и на следующих отдаёт тот же объект.
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

import { useEffect, useEffectEvent, useReducer, useRef } from 'react'
import type { IAdapterContext } from '@soldy/setup'

/** Счётчик версий: его смена перерисовывает компонент с новым контекстом. */
const nextVersion = (version: number) => version + 1

export function useAdapterContext<TInstance extends object, TOutputs extends object = object>(
	factory: () => IAdapterContext<TInstance, TOutputs>,
): IAdapterContext<TInstance, TOutputs> {
	const ref = useRef<IAdapterContext<TInstance, TOutputs> | null>(null)
	// Контекст в `ref` уничтожен очисткой эффекта; признак — хука, не контекста
	const destroyed = useRef(false)
	const [, rerender] = useReducer(nextVersion, 0)
	// Эффект зовёт фабрику последнего рендера, а не той, что застал при установке
	const rebuild = useEffectEvent(factory)

	if (!ref.current) {
		ref.current = factory()
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
