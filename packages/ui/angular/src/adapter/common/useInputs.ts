/**
 * useInputs — build-time утилита: извлекает имена Angular-инпутов из дескриптора.
 *
 * ⚠️ Используется ТОЛЬКО в кодогенераторе (codegen/generate.ts), НЕ в компонентах.
 * Angular AOT требует статические массивы строк в @Component({ inputs }), поэтому
 * результат этого вызова сериализуется в generated/*.metadata.ts на этапе сборки.
 */

import type { IComponentDescriptor } from '@soldy/setup'
import { createInspector } from './createInspector'

/** Служебные пропы, передаваемые отдельным @Input() / @Output(), а не через массивы. */
const SERVICE_INPUTS = new Set(['ctrl', 'plugins'])

export function useInputs(descriptor: IComponentDescriptor): string[] {
	return Object.keys(createInspector(descriptor).getExportProps()).filter(
		(name) => !SERVICE_INPUTS.has(name),
	)
}
