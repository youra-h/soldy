/**
 * Статический хелпер для сборки emits во Vue Options API (base.component.ts).
 *
 * Выполняется на этапе объявления компонента (Build Time),
 * не имеет сайд-эффектов и не тянет реактивный runtime.
 */

import { TSurface, type IComponentDescriptor } from '@soldy-ui/setup'
import { VueProfile } from '../common'

/**
 * События ядра, триггеры свойств и `update:<prop>` для `v-model` — всё из
 * поверхности: объявление и эмит ходят по ней одной, иначе Vue ругался бы на
 * необъявленное событие.
 */
export function useEmits(descriptor: IComponentDescriptor): string[] {
	return [...TSurface.of(descriptor, VueProfile).exportEvents]
}
