/**
 * Статический хелпер для сборки props во Vue Options API (base.component.ts).
 *
 * Выполняется на этапе объявления компонента (Build Time),
 * не имеет сайд-эффектов и не тянет реактивный runtime.
 */

import type { PropType } from 'vue'
import type { IComponentDescriptor } from '@soldy/setup'
import { createInspector } from '../common'

/**
 * Приводит агностичный type из ядра к формату Vue (PropType)
 */
function resolveVueType(rawType: any): PropType<any> | undefined {
	if (!rawType) return undefined

	// Если тип был задефайнен через наш defineType<T>(Object / Array)
	if (typeof rawType === 'object' && rawType.ctor) {
		return rawType.ctor as PropType<any>
	}

	// Если передали обычный JS-конструктор (Boolean, String, Object)
	return rawType as PropType<any>
}

export function useProps(descriptor: IComponentDescriptor): Record<string, any> {
	const defaults = (descriptor.ctor as any)?.defaultValues ?? {}
	const rawProps = createInspector(descriptor).getExportProps(defaults)

	const vueProps: Record<string, any> = {}

	for (const [propName, config] of Object.entries(rawProps)) {
		vueProps[propName] = {
			...config,
			// Адаптируем тип под рантайм и TS-систему Vue
			...(config.type !== undefined ? { type: resolveVueType(config.type) } : {}),
		}
	}

	return vueProps
}
