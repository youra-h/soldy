/**
 * Vue-адаптер: генерирует props из ComponentModel.
 *
 * Для каждого свойства модели (кроме event) создаёт Vue prop
 * с типом, выведенным из defaultValues конструктора.
 */

import type { IComponentModel } from '@soldy/host'
import type { TConstructor } from '@soldy/core'

function inferVueType(value: unknown): any {
	if (typeof value === 'boolean') return Boolean

	if (typeof value === 'string') return String

	if (typeof value === 'number') return Number

	if (Array.isArray(value)) return Array

	return [String, Object]
}

export function useProps(model: IComponentModel, ctor: TConstructor): Record<string, any> {
	const defaults: Record<string, any> = (ctor as any).defaultValues ?? {}

	const props: Record<string, any> = {}

	for (const m of model.members) {
		if (m.kind === 'event') continue

		const d = defaults[m.name]

		props[m.name] = {
			type: inferVueType(d),
			default: d,
		}
	}

	// entity-level props
	props.ctrl = { type: Object, default: undefined }
	props.plugins = { type: Object, default: undefined }

	return props
}
