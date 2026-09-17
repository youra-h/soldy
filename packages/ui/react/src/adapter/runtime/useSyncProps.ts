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
	onInput?: (prop: IAccessorProp, value: unknown) => unknown
	/** Коллбэк при обновлении значения из Core в React */
	onOutput?: (prop: IAccessorProp, value: unknown) => void
}

type TState = Readonly<Record<string, unknown>>
type TAction = { name: string; value: unknown }

function buildState(accessor: IAccessor, inspector: TDescriptorInspector): TState {
	const state: Record<string, unknown> = {}

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
					// Свежесть значения — ответственность ядра: составные props
					// отдают снимок через valueOf() (см. TClasses, драйвер коллекции)
					// либо заменяются целиком (layout-плагины). Адаптер не угадывает.
					const value = accessor.getValue(prop)

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
	function bindInput(props: object): void {
		for (const prop of accessor.getProps(false) as IAccessorProp[]) {
			const exportName = inspector.getExportPropName(prop)
			const value: unknown =
				Reflect.get(props, exportName) ?? Reflect.get(props, prop.name.name)

			if (value === undefined) continue

			// Не пишем в Core, если значение не изменилось: эффект получает все
			// props на каждом рендере родителя. Сеттер, эмитящий и на том же
			// значении, замкнул бы через колбэки событий цикл ре-рендеров — так
			// было с `visible`, пока show()/hide() не начали проверять значение
			// до эмита show:before/hide:before.
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
