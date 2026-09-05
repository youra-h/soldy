/**
 * useOutputs — возвращает массив имён Angular-аутпутов для дескриптора.
 *
 * Аналог useEmits (Vue), но для Angular @Component({ outputs: [...] }).
 * Включает явные события дескриптора + триггеры всех props (в т.ч. protected)
 * в формате AngularNaming (camelCase, без `on`-префикса).
 *
 * В отличие от Vue's useEmits, здесь нет `update:${prop}` для v-model —
 * Angular использует стандартные @Input/@Output пары вместо v-model.
 */

import type { IComponentDescriptor } from '@soldy/setup'
import { createInspector } from './../common'

export function useOutputs(descriptor: IComponentDescriptor): string[] {
	return createInspector(descriptor).getExportEvents()
}
