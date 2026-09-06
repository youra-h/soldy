/**
 * useInputs — build-time утилита: извлекает имена Angular-инпутов из дескриптора.
 *
 * ⚠️ Используется ТОЛЬКО в кодогенераторе (codegen/generate.ts), НЕ в компонентах.
 * Angular AOT требует статические массивы строк в @Component({ inputs }), поэтому
 * результат этого вызова сериализуется в generated/*.metadata.ts на этапе сборки.
 */

import type { IComponentDescriptor } from '@soldy/setup'
import { createInspector } from './createInspector'

/**
 * `ctrl` объявлен в EntityContribution и потому попадает в getExportProps(),
 * но в Angular он приходит из отдельного `@Input() ctrl` в TComponentBase.
 * Без этого фильтра он был бы объявлен дважды.
 */
const SERVICE_INPUTS = new Set(['ctrl'])

export function useInputs(descriptor: IComponentDescriptor): string[] {
	return Object.keys(createInspector(descriptor).getExportProps()).filter(
		(name) => !SERVICE_INPUTS.has(name),
	)
}
