/**
 * Имена входов по дескриптору — для кодогенератора: AOT требует литеральных
 * массивов в декораторе (`generated/*.metadata.ts`).
 */

import { TSurface, type IComponentDescriptor } from '@soldy-ui/setup'
import { AngularProfile } from './profile'

/**
 * Не входы: `ctrl` объявляет база, а `tag` база берёт у элемента потребителя —
 * имя тега у живого элемента не меняется.
 */
const SERVICE_INPUTS = new Set(['ctrl', 'tag'])

export function useInputs(descriptor: IComponentDescriptor): string[] {
	return Object.keys(TSurface.of(descriptor, AngularProfile).exportProps).filter(
		(name) => !SERVICE_INPUTS.has(name),
	)
}

/**
 * Входы, чей проп объявлен ровно `Boolean`: им генератор ставит
 * `transform: booleanInput`. У `value` полей `Boolean` — один из типов, и
 * пустая строка там — значение.
 */
export function useBooleanInputs(descriptor: IComponentDescriptor): string[] {
	const { exportProps } = TSurface.of(descriptor, AngularProfile)

	return Object.keys(exportProps).filter(
		(name) => !SERVICE_INPUTS.has(name) && exportProps[name].type === Boolean,
	)
}
