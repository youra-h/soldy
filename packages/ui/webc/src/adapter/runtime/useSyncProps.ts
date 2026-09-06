/**
 * useSyncProps — связывает Core и состояние кастомного элемента.
 *
 * В отличие от остальных адаптеров, реактивного примитива здесь нет вообще:
 * состояние — обычный объект, а об изменении сообщает колбэк `onUpdate`.
 * Перерисовку планирует уже базовый класс элемента.
 */

import type { IAccessor, IAccessorProp, TDescriptorInspector } from '@soldy/accessor'

export type TWebcState = Record<string, any>

function buildInitialState(accessor: IAccessor, inspector: TDescriptorInspector): TWebcState {
	const state: TWebcState = {}

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
	onUpdate: (name: string, value: unknown) => void,
) {
	const state = buildInitialState(accessor, inspector)

	/** Core → элемент: подписка на триггеры. Возвращает функцию отписки. */
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

					state[exportName] = value
					onUpdate(exportName, value)
				}

				eventSource.on(rawTrigger, handler)
				offs.push(() => eventSource.off(rawTrigger, handler))
			}
		}

		return () => offs.forEach((off) => off())
	}

	/** Элемент → Core: запись входных значений (атрибуты и свойства). */
	function bindInput(props: Record<string, any>): void {
		for (const prop of accessor.getProps(false) as IAccessorProp[]) {
			const exportName = inspector.getExportPropName(prop)
			const value = props[exportName] ?? props[prop.name.name]

			if (value === undefined) continue

			// Не пишем в Core, если значение не изменилось: сеттеры вроде
			// `visible` дёргают show()/hide(), что даёт лишние циклы.
			if (accessor.getValue(prop) === value) continue

			accessor.setValue(prop, value)
		}
	}

	return { state, bindOutput, bindInput }
}
