/**
 * useSyncProps — Angular-версия синхронизации Core ↔ Angular состояния.
 *
 * Не использует React hooks или Vue реактивность — работает через plain функции
 * и событийные подписки. Возвращает отписку.
 *
 * - buildInitialState: читает начальные значения из accessor
 * - bindOutput: Core → Angular (подписка на триггеры, вызывает onUpdate)
 * - bindInput: Angular → Core (запись входных props в accessor)
 */

import type { IAccessor, IAccessorProp, TDescriptorInspector } from '@soldy/accessor'

export type TAngularState = Record<string, any>

/** Читает начальное состояние из accessor (только props с триггерами). */
export function buildInitialState(
	accessor: IAccessor,
	inspector: TDescriptorInspector,
): TAngularState {
	const state: TAngularState = {}

	for (const prop of accessor.getProps(true) as IAccessorProp[]) {
		if (inspector.getRawTriggers(prop).length === 0) continue

		state[inspector.getExportPropName(prop)] = accessor.getValue(prop)
	}

	return state
}

/** Core → Angular: подписывается на триггеры props, вызывает onUpdate при каждом изменении. */
export function bindOutput(
	accessor: IAccessor,
	inspector: TDescriptorInspector,
	onUpdate: (name: string, value: any) => void,
): () => void {
	const offs: Array<() => void> = []

	for (const prop of accessor.getProps(true) as IAccessorProp[]) {
		const rawTriggers = inspector.getRawTriggers(prop)

		if (rawTriggers.length === 0) continue

		const exportName = inspector.getExportPropName(prop)
		const eventSource = accessor.getEventSource(prop)

		if (!eventSource) continue

		for (const rawTrigger of rawTriggers) {
			const handler = () => {
				onUpdate(exportName, accessor.getValue(prop))
			}

			eventSource.on(rawTrigger, handler)
			offs.push(() => eventSource.off(rawTrigger, handler))
		}
	}

	return () => offs.forEach((off) => off())
}

/** Angular → Core: записывает входные props в accessor (с guard от лишних записей). */
export function bindInput(
	accessor: IAccessor,
	inspector: TDescriptorInspector,
	inputs: Record<string, any>,
): void {
	for (const prop of accessor.getProps(false) as IAccessorProp[]) {
		const exportName = inspector.getExportPropName(prop)
		const value = inputs[exportName] ?? inputs[prop.name.name]

		if (value === undefined) continue

		// Guard: сеттеры вроде `visible` → show()/hide() эмитят события
		// даже при том же значении, что может привести к лишним циклам.
		if (accessor.getValue(prop) === value) continue

		accessor.setValue(prop, value)
	}
}
