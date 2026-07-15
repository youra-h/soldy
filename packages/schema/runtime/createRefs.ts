import type { ISchema } from '../types'
import type { IAdapterResult } from './createAdapter'

/**
 * Создаёт реактивные refs для всех свойств из схемы (props + computed)
 * и автоматически обновляет их при изменениях из core.
 *
 * @param schema — схема компонента
 * @param adapter — результат createAdapter (содержит instance, binding)
 * @param createCell — фабрика реактивной ячейки для конкретного фреймворка
 * @returns словарь refs, где ключ — имя свойства из схемы
 */
export function createRefs(
	schema: ISchema<any, any>,
	adapter: IAdapterResult,
	createCell: (getter: () => any) => { ref: any; trigger: () => void },
): Record<string, any> {
	const refs: Record<string, any> = {}
	const triggers: Record<string, () => void> = {}

	const allProps = { ...schema.props, ...schema.computed }
	for (const [name, propDef] of Object.entries(allProps)) {
		if (!propDef) continue

		const { ref, trigger } = createCell(() => propDef.get(adapter.instance))
		refs[name] = ref
		triggers[name] = trigger
	}

	adapter.binding.subscribe((change) => {
		if (change.type === 'property') {
			triggers[change.name]?.()
		}
	})

	return refs
}
