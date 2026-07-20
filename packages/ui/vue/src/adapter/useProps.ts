/**
 * Vue-адаптер: генерирует props из ComponentModel.
 *
 * Для каждого свойства модели (кроме event) создаёт Vue prop
 * с типом, выведенным из defaultValues конструктора.
 */

import type { IComponentModel } from '@soldy/provider'
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

	for (const prop of model.publicProps) {
		if (prop.kind === 'event') continue

		const value = defaults[prop.name]

		props[prop.name] = {
			type: inferVueType(value),
			default: value,
		}
	}

	// entity-level props
	props.ctrl = { type: Object, default: undefined }
	props.plugins = { type: Object, default: undefined }

	return props
}
