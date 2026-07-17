/**
 * Vue-адаптер: генерирует emits из ComponentModel.
 *
 * - events модели → эмитятся как есть
 * - свойства модели → change:{name} для всех, update:{name} для mutable
 */

import type { ComponentModel } from '@soldy/host'

export function useEmits(model: ComponentModel): string[] {
	const emits: string[] = [...model.events]

	for (const m of model.members) {
		if (m.kind === 'event') continue
		emits.push(`change:${m.name}`)
		if (m.mutable) {
			emits.push(`update:${m.name}`)
		}
	}

	return [...new Set(emits)]
}
