/**
 * useSyncProps — связывает Core и React-состояние.
 *
 * - bindOutput: читает начальные значения из accessor и подписывается на триггеры
 *   (Core → React): при каждом событии перечитывает значение через accessor.getValue()
 *   и диспатчит обновление состояния.
 *
 * Вход (React → Core) обрабатывается отдельно в useComponent через effect,
 * чтобы не плодить циклические обновления.
 */

import { useEffect, useReducer } from 'react'
import type { IAccessor, IAccessorProp, TDescriptorInspector } from '@soldy/accessor'

type TState = Record<string, any>
type TAction = { name: string; value: any }

/**
 * Клонирует array-like и plain-объекты, чтобы React гарантированно
 * увидел новую ссылку при in-place мутациях (аналог клонирования в Vue).
 */
function cloneValue(value: any): any {
	if (value == null) return value

	const isArrayLike =
		typeof value === 'object' &&
		typeof value.length === 'number' &&
		typeof value[Symbol.iterator] === 'function'

	if (isArrayLike) return Array.from(value)

	const isPlainObj =
		typeof value === 'object' && value !== null && value.constructor === Object

	if (isPlainObj) return { ...value }

	return value
}

function buildState(accessor: IAccessor, inspector: TDescriptorInspector): TState {
	const state: TState = {}

	for (const prop of accessor.getProps(true) as IAccessorProp[]) {
		// Пропускаем pass-through свойства без триггеров (ctrl, plugins)
		if (inspector.getRawTriggers(prop).length === 0) continue

		state[inspector.getExportPropName(prop)] = accessor.getValue(prop)
	}

	return state
}

function reducer(prev: TState, action: TAction): TState {
	if (Object.is(prev[action.name], action.value)) return prev

	return { ...prev, [action.name]: action.value }
}

export function useSyncProps(accessor: IAccessor, inspector: TDescriptorInspector): TState {
	const [state, dispatch] = useReducer(reducer, undefined, () => buildState(accessor, inspector))

	useEffect(() => {
		const offs: Array<() => void> = []

		for (const prop of accessor.getProps(true) as IAccessorProp[]) {
			const rawTriggers = inspector.getRawTriggers(prop)

			if (rawTriggers.length === 0) continue

			const exportName = inspector.getExportPropName(prop)
			const eventSource = accessor.getEventSource(prop)

			if (!eventSource) continue

			for (const rawTrigger of rawTriggers) {
				const handler = () => {
					dispatch({ name: exportName, value: cloneValue(accessor.getValue(prop)) })
				}

				eventSource.on(rawTrigger, handler)
				offs.push(() => eventSource.off(rawTrigger, handler))
			}
		}

		return () => offs.forEach((off) => off())
	}, [accessor, inspector])

	return state
}
