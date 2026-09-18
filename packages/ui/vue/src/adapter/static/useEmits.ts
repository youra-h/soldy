/**
 * Статический хелпер для сборки emits во Vue Options API (base.component.ts).
 *
 * Выполняется на этапе объявления компонента (Build Time),
 * не имеет сайд-эффектов и не тянет реактивный runtime.
 */

import { surfaceOf, type IComponentDescriptor } from '@soldy/setup'
import { VueProfile } from '../common'

export function useEmits(descriptor: IComponentDescriptor): string[] {
	const surface = surfaceOf(descriptor, VueProfile)

	// `update:<prop>` — на каждый записываемый проп с триггерами, плагинные
	// включительно: на них держится `v-model`. Объявление и эмит ходят по
	// одной поверхности — иначе Vue ругался бы на необъявленное событие
	// (`update:anchor_anchor` у Frame).
	const models = surface.inputs
		.filter((prop) => prop.triggers.length > 0)
		.map((prop) => `update:${prop.exportName}`)

	return [...new Set([...surface.exportEvents, ...models])]
}
