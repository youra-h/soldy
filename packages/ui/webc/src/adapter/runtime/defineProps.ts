/**
 * defineProps — вешает на прототип элемента геттеры/сеттеры для всех props
 * дескриптора, чтобы работал JS-путь: `el.text = 'Click'`.
 *
 * Сама работа — в `TSoldyElement.defineProps`: `getProp`/`setProp` защищённые,
 * и только тело класса видит их без приведения.
 */

import type { IComponentDescriptor } from '@soldy-ui/setup'
import type { TSoldyElement } from './element.base'

export function defineProps(
	target: Pick<typeof TSoldyElement, 'defineProps'>,
	descriptor: IComponentDescriptor,
): void {
	target.defineProps(descriptor)
}
