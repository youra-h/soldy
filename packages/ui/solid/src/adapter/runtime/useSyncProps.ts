/**
 * useSyncProps — связывает Core и реактивное состояние Solid.
 *
 * Состояние держится в `createStore`, а не в сигнале: store даёт
 * реактивность на уровне отдельных свойств, поэтому изменение одного пропа
 * не перерисовывает всё, что читает остальные.
 *
 * Возвращает { state, bindOutput, bindInput }:
 *
 * - bindOutput(): Core → Solid. Подписывается на триггеры props и перечитывает
 *   значение через accessor при каждом событии. Возвращает функцию отписки.
 *
 * - bindInput(props): Solid → Core. Синхронизирует внешние props во внутреннее
 *   состояние Core (с guard'ом от записи того же значения).
 */

import { createStore } from 'solid-js/store'
import type { IAccessor, IAccessorProp, TDescriptorInspector } from '@soldy/accessor'

export interface ISyncOptions {
	/** Коллбэк перед записью значения из Solid во внутренний Core */
	onInput?: (prop: IAccessorProp, value: any) => any
	/** Коллбэк при обновлении значения из Core в Solid */
	onOutput?: (prop: IAccessorProp, value: any) => void
}

function buildInitialState(
	accessor: IAccessor,
	inspector: TDescriptorInspector,
): Record<string, any> {
	const state: Record<string, any> = {}

	for (const prop of accessor.getProps(true) as IAccessorProp[]) {
		// Пропускаем pass-through свойства без триггеров (ctrl)
		if (inspector.getRawTriggers(prop).length === 0) continue

		state[inspector.getExportPropName(prop)] = accessor.getValue(prop)
	}

	return state
}

export function useSyncProps(
	accessor: IAccessor,
	inspector: TDescriptorInspector,
	options: ISyncOptions = {},
) {
	const [state, setState] = createStore<Record<string, any>>(
		buildInitialState(accessor, inspector),
	)

	// 1. Core → Solid (Output): подписка на триггеры props
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
					// отдают снимок через valueOf() либо заменяются целиком.
					const value = accessor.getValue(prop)

					// Merge-форма, а не setState(key, value): при значении-функции
					// путевая форма трактовала бы его как updater.
					setState({ [exportName]: value })
					options.onOutput?.(prop, value)
				}

				eventSource.on(rawTrigger, handler)
				offs.push(() => eventSource.off(rawTrigger, handler))
			}
		}

		return () => offs.forEach((off) => off())
	}

	// 2. Solid → Core (Input): синхронизация внешних props
	function bindInput(props: Record<string, any>): void {
		for (const prop of accessor.getProps(false) as IAccessorProp[]) {
			const exportName = inspector.getExportPropName(prop)
			const value = props[exportName] ?? props[prop.name.name]

			if (value === undefined) continue

			// Не пишем в Core, если значение не изменилось: сеттеры вроде
			// `visible` дёргают show()/hide(), что даёт лишние циклы.
			if (accessor.getValue(prop) === value) continue

			accessor.setValue(prop, options.onInput ? options.onInput(prop, value) : value)
		}
	}

	return { state, bindOutput, bindInput }
}
