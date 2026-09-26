/**
 * useInputs — build-time утилита: извлекает имена Angular-инпутов из дескриптора.
 *
 * ⚠️ Используется ТОЛЬКО в кодогенераторе (codegen/generate.ts), НЕ в компонентах.
 * Angular AOT требует статические массивы строк в `inputs` декоратора, поэтому
 * результат этого вызова сериализуется в generated/*.metadata.ts на этапе сборки.
 *
 * Имя входа — оно же имя пропа в пропсах дескриптора (`underscorePropNaming`,
 * как у всех адаптеров): по нему сгенерированный `T<Имя>Surface` берёт тип
 * входа (`TInputValue`).
 *
 * `useBooleanInputs` — те же входы, суженные до булевых: им генератор ставит
 * `transform: booleanInput` (`adapter/runtime/boolean-input.ts`).
 */

import { TSurface, type IComponentDescriptor } from '@soldy-ui/setup'
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

/**
 * Булевы входы — те, чей проп объявлен ровно `Boolean`, в порядке `useInputs`.
 *
 * Атрибут без значения (`<soldy-button disabled>`) такой вход включает, как в
 * остальных адаптерах. Проп, у которого `Boolean` — один из типов массива, сюда
 * не входит: у `value` полей (`[String, Number, Boolean, Object, Array]`)
 * пустая строка — это значение, а параметр transform отрезал бы остальные
 * типы.
 */
export function useBooleanInputs(descriptor: IComponentDescriptor): string[] {
	const { exportProps } = TSurface.of(descriptor, AngularProfile)

	return useInputs(descriptor).filter((name) => exportProps[name].type === Boolean)
}
