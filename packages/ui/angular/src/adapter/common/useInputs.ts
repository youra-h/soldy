/**
 * useInputs — build-time утилита: извлекает имена Angular-инпутов из дескриптора.
 *
 * ⚠️ Используется ТОЛЬКО в кодогенераторе (codegen/generate.ts), НЕ в компонентах.
 * Angular AOT требует статические массивы строк в @Component({ inputs }), поэтому
 * результат этого вызова сериализуется в generated/*.metadata.ts на этапе сборки.
 */

import { TSurface, type IComponentDescriptor } from '@soldy/setup'
import { AngularProfile } from './profile'

/**
 * `ctrl` объявлен в EntityDescriptor и потому попадает в поверхность,
 * но в Angular он приходит из отдельного `@Input() ctrl` в TComponentBase.
 * Без этого фильтра он был бы объявлен дважды.
 */
const SERVICE_INPUTS = new Set(['ctrl'])

export function useInputs(descriptor: IComponentDescriptor): string[] {
	return Object.keys(TSurface.of(descriptor, AngularProfile).exportProps).filter(
		(name) => !SERVICE_INPUTS.has(name),
	)
}
