/**
 * Vue-адаптер: генерирует emits из ComponentModel.
 *
 * - events модели → эмитятся как есть
 * - свойства модели → change:{name} для всех, update:{name} для mutable
 */

import type { IDescriptor } from '@soldy/provider'

export function useEmits(descriptor: IDescriptor): string[] {
	const emits: string[] = [...descriptor.events]

	for (const prop of descriptor.props) {
		if (prop.protected) continue

		emits.push(`update:${prop.name}`)
	}

	const uniqueEmits = new Set(emits)

	return [...uniqueEmits]
}
