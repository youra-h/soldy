/**
 * defineProps — вешает на прототип элемента геттеры/сеттеры для всех props
 * дескриптора, чтобы работал JS-путь: `el.text = 'Click'`.
 *
 * Атрибуты покрывают только примитивы (это строки), поэтому свойства —
 * единственный способ передать объект или готовый инстанс.
 *
 * `ctrl` пропускается: у него собственная пара в TSoldyElement, потому что
 * читать его нужно из буфера, а не из state (у него нет триггеров).
 */

import type { IComponentDescriptor } from '@soldy/setup'
import { createInspector } from '../common'
import type { TSoldyElement } from './element.base'

const SKIP = new Set(['ctrl'])

export function defineProps(
	target: { prototype: any },
	descriptor: IComponentDescriptor,
): void {
	const props = Object.keys(createInspector(descriptor).getExportProps())

	for (const prop of props) {
		if (SKIP.has(prop)) continue
		if (Object.prototype.hasOwnProperty.call(target.prototype, prop)) continue

		Object.defineProperty(target.prototype, prop, {
			configurable: true,
			enumerable: true,

			get(this: TSoldyElement) {
				return (this as any).getProp(prop)
			},

			set(this: TSoldyElement, value: unknown) {
				;(this as any).setProp(prop, value)
			},
		})
	}
}
