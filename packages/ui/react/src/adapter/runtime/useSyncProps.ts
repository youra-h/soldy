/**
 * useSyncProps — связывает Core и React-состояние (аналог Vue useSyncProps).
 *
 * Возвращает { state, bindOutput, bindInput, cleanup }:
 *
 * - bindOutput(): Core → React (Output). Подписывается на триггеры props
 *   и перечитывает значение через accessor.getValue() при каждом событии.
 *   Возвращает функцию отписки (используется как cleanup useEffect'а).
 *
 * - bindInput(props): React → Core (Input). Синхронизирует внешние props
 *   во внутреннее состояние Core (с guard'ом от записи того же значения).
 *
 * - cleanup(): снимает все подписки Output.
 */

import { useReducer } from 'react'
import type { IAccessor, IAccessorProp, TDescriptorInspector } from '@soldy/accessor'

export interface ISyncOptions {
	/** Коллбэк перед записью значения из React во внутренний Core */
	onInput?: (prop: IAccessorProp, value: any) => any
	/** Коллбэк при обновлении значения из Core в React */
	onOutput?: (prop: IAccessorProp, value: any) => void
}

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

export function useSyncProps(
	accessor: IAccessor,
	inspector: TDescriptorInspector,
	options: ISyncOptions = {},
) {
	const [state, dispatch] = useReducer(reducer, undefined, () => buildState(accessor, inspector))
	const cleanupFns: Array<() => void> = []

	// 1. Core → React (Output): подписка на триггеры props
	function bindOutput(): () => void {
		const offs: Array<() => void> = []

		for (const prop of accessor.getProps(true) as IAccessorProp[]) {
			const rawTriggers = inspector.getRawTriggers(prop)

			if (rawTriggers.length === 0) continue

			const exportName = inspector.getExportPropName(prop)
			const eventSource = accessor.getEventSource(prop)

			if (!eventSource) continue

			for (const rawTrigger of rawTriggers) {
				const handler = () => {
					const value = cloneValue(accessor.getValue(prop))

					dispatch({ name: exportName, value })
					options.onOutput?.(prop, value)
				}

				eventSource.on(rawTrigger, handler)
				offs.push(() => eventSource.off(rawTrigger, handler))
			}
		}

		cleanupFns.push(...offs)

		return () => offs.forEach((off) => off())
	}

	// 2. React → Core (Input): синхронизация внешних props
	function bindInput(props: Record<string, any>): void {
		for (const prop of accessor.getProps(false) as IAccessorProp[]) {
			const exportName = inspector.getExportPropName(prop)
			const value = props[exportName] ?? props[prop.name.name]

			if (value === undefined) continue

			// Не пишем в Core, если значение не изменилось: сеттеры вроде
			// `visible` → show()/hide() эмитят show:before/hide:before даже
			// при том же значении, что даёт бесконечный цикл ре-рендеров.
			if (accessor.getValue(prop) === value) continue

			const valueToSet = options.onInput ? options.onInput(prop, value) : value

			accessor.setValue(prop, valueToSet)
		}
	}

	function cleanup(): void {
		cleanupFns.forEach((fn) => fn())
		cleanupFns.length = 0
	}

	return {
		state,
		bindOutput,
		bindInput,
		cleanup,
	}
}
