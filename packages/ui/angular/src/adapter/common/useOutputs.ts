/**
 * Выходы по дескриптору с полным именем события ядра (`soActionPress` —
 * `action:press`) — для кодогенератора: по событию `T<Имя>Surface` берёт тип
 * выхода.
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
