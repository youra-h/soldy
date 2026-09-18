/**
 * Статический хелпер для сборки props во Vue Options API (base.component.ts).
 *
 * Выполняется на этапе объявления компонента (Build Time),
 * не имеет сайд-эффектов и не тянет реактивный runtime.
 */

import type { PropType } from 'vue'
import { surfaceOf, type IComponentDescriptor } from '@soldy/setup'
import { VueProfile } from '../common'

/** Тип пропа для Vue: конструктор из `defineType(…)` или сам конструктор. */
function resolveVueType(rawType: unknown): PropType<unknown> | undefined {
	if (!rawType) return undefined
	if (typeof rawType === 'object' && 'ctor' in rawType && rawType.ctor) {
		return rawType.ctor as PropType<unknown>
	}

	return rawType as PropType<unknown>
}

export function useProps(descriptor: IComponentDescriptor): Record<string, unknown> {
	const vueProps: Record<string, unknown> = {}

	// Умолчание — поле декларации пропа: его собирает setup, адаптер только
	// раскладывает (см. AGENTS.md, «Умолчание пропа — в декларации»)
	for (const [propName, config] of Object.entries(
		surfaceOf(descriptor, VueProfile).exportProps,
	)) {
		vueProps[propName] = {
			...config,
			// Адаптируем тип под рантайм и TS-систему Vue
			...(config.type !== undefined ? { type: resolveVueType(config.type) } : {}),
		}
	}

	return vueProps
}
