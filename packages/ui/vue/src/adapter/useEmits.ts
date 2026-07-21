/**
 * Vue-адаптер: генерирует emits из ComponentModel.
 *
 * - events модели → эмитятся как есть
 * - свойства модели → change:{name} для всех, update:{name} для mutable
 */

import type { IComponentModel } from '@soldy/provider'

export function useEmits(model: IComponentModel): string[] {
	const emits: string[] = [...model.events]

	for (const prop of model.props) {
		if (prop.protected) continue

		emits.push(`change:${prop.name}`)
		emits.push(`update:${prop.name}`)
	}

	const uniqueEmits = new Set(emits)

	return [...uniqueEmits]
}
