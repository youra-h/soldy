/**
 * Статический хелпер для сборки props во Vue Options API (base.component.ts).
 *
 * Выполняется на этапе объявления компонента (Build Time),
 * не имеет сайд-эффектов и не тянет реактивный runtime.
 */

import { TSurface, type IComponentDescriptor } from '@soldy-ui/setup'
import { VueProfile } from '../common'

export function useProps(descriptor: IComponentDescriptor): Record<string, unknown> {
	const vueProps: Record<string, unknown> = {}

	// Тип и умолчание — поля декларации пропа, адаптер раскладывает их как есть:
	// `type` — конструктор, которого и ждёт Vue, умолчание собирает setup (см.
	// AGENTS.md, «Умолчание пропа — в декларации»). Копия — чтобы опции
	// компонента не делили объекты с закэшированной поверхностью
	for (const [propName, config] of Object.entries(
		TSurface.of(descriptor, VueProfile).exportProps,
	)) {
		vueProps[propName] = { ...config }
	}

	return vueProps
}
