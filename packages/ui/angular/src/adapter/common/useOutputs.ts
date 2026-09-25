/**
 * useOutputs — build-time утилита: выходы Angular по дескриптору и события ядра за ними.
 *
 * ⚠️ Используется ТОЛЬКО в кодогенераторе (codegen/generate.ts), НЕ в компонентах.
 * Angular AOT требует статические массивы строк в @Component({ outputs }), поэтому
 * имена выходов сериализуются в generated/*.metadata.ts на этапе сборки.
 *
 * Выход идёт в паре с полным именем события ядра (`actionPress` —
 * `action:press`): по нему сгенерированный `T<Имя>Outputs` берёт тип выхода из
 * карты событий дескриптора (`TOutputEmitter`). Пара — из той же записи
 * поверхности, поэтому зеркала именования Angular в типах не нужно.
 */

import { TSurface, type IComponentDescriptor } from '@soldy-ui/setup'
import { AngularProfile } from './profile'

export function useOutputs(
	descriptor: IComponentDescriptor,
): (readonly [output: string, event: string])[] {
	return TSurface.of(descriptor, AngularProfile).events.map((event) => [
		event.exportName,
		event.name.getName(),
	])
}
