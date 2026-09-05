/**
 * useOutputs — build-time утилита: извлекает имена Angular-аутпутов из дескриптора.
 *
 * ⚠️ Используется ТОЛЬКО в кодогенераторе (codegen/generate.ts), НЕ в компонентах.
 * Angular AOT требует статические массивы строк в @Component({ outputs }), поэтому
 * результат этого вызова сериализуется в generated/*.metadata.ts на этапе сборки.
 */

import type { IComponentDescriptor } from '@soldy/setup'
import { createInspector } from './createInspector'

export function useOutputs(descriptor: IComponentDescriptor): string[] {
	return createInspector(descriptor).getExportEvents()
}
