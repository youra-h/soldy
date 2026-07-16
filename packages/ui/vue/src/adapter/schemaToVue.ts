import type { ISchema } from '@soldy/schema'
import type { TEmits, TProps } from '../types/common'

/**
 * Определить Vue-тип (Boolean, String, …) по значению дефолта.
 */
function inferVueType(value: unknown): any {
	if (typeof value === 'boolean') return Boolean
	if (typeof value === 'string') return String
	if (typeof value === 'number') return Number
	if (Array.isArray(value)) return Array
	if (typeof value === 'object' && value !== null) return Object
	return undefined
}

/**
 * Сгенерировать Vue-emits из схемы.
 *
 * Включает все события схемы + `update:<prop>` и `update:<readonly>`
 * для совместимости с v-model.
 */
export function schemaToVueEmits(schema: ISchema<any, any>): TEmits {
	const events = [...schema.getAllEvents()]



	// for (const name of Object.keys(schema.props)) {
	// 	events.push(`update:${name}`)
	// }

	// for (const name of Object.keys(schema.readonly ?? {})) {
	// 	events.push(`update:${name}`)
	// }

	console.log('schemaToVueEmits', events)

	return events as unknown as TEmits
}

/**
 * Сгенерировать Vue-props из схемы.
 *
 * Для каждого schema-пропса (у которого есть `set`) создаёт
 * Vue-определение с типом, выведенным из `Ctor.defaultValues`.
 *
 * @param schema  — схема компонента
 * @param extra   — дополнительные Vue-пропсы, которых нет в схеме
 *                  (например, `ctrl` для передачи готового инстанса)
 *
 * @example
 * ```ts
 * export const props = schemaToVueProps(
 *   componentSchema,
 *   {
 *     ctrl: {
 *       type: Object as PropType<IComponent | UnwrapNestedRefs<IComponent>>,
 *     },
 *   },
 * )
 * ```
 */
export function schemaToVueProps(schema: ISchema<any, any>, extra?: Record<string, any>): TProps {
	const defaults = (schema.Ctor as any).defaultValues ?? {}
	const result: Record<string, any> = {}

	for (const key of Object.keys(schema.props)) {
		const defaultVal = defaults[key]

		result[key] = {
			type: inferVueType(defaultVal),
			default: defaultVal,
		}
	}

	if (extra) {
		Object.assign(result, extra)
	}

	return Object.freeze(result) as unknown as TProps
}
