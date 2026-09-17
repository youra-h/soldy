/**
 * collectForwardProps — пропсы, которые компонент не съел: спред в атрибуты корня.
 *
 * Спредят их React, Solid и Svelte. Съедает компонент всё, что объявлено в
 * контракте: пропы (и их триггеры), события и слоты. Слоты берутся по
 * дескриптору, имя слота по умолчанию
 * проводится через `resolveSlotName` — во всех трёх фреймворках это `children`.
 * Без слотов в наборе `leading={<Icon/>}` доезжал бы до DOM атрибутом.
 *
 * `ctrl` и `embedded` съедаются всегда: их принимает сам адаптер.
 */

import type { TDescriptorInspector } from '@soldy/accessor'
import { resolveSlotName } from './slots'
import type { IForwardPropsSource } from './types'

export function collectForwardProps<TProps extends object>(
	props: TProps,
	source: IForwardPropsSource,
	inspector: TDescriptorInspector,
	defaultSlotName: string,
): Partial<TProps> {
	const consumed = new Set<string>([defaultSlotName, 'ctrl', 'embedded'])

	for (const prop of source.accessor.getProps(true)) {
		consumed.add(inspector.getExportPropName(prop))
		consumed.add(prop.name.name)

		for (const trigger of inspector.getExportTriggers(prop)) {
			consumed.add(trigger)
		}
	}

	for (const evt of source.accessor.getEvents()) {
		consumed.add(inspector.getExportEventName(evt.name))
	}

	for (const slot of source.descriptor.getSlots()) {
		consumed.add(resolveSlotName(slot.name, defaultSlotName))
	}

	const rest: Partial<TProps> = {}

	for (const key of Object.keys(props)) {
		if (!consumed.has(key)) Reflect.set(rest, key, Reflect.get(props, key))
	}

	return rest
}
