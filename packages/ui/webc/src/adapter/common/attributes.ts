/**
 * Мост между HTML-атрибутами и props ядра.
 *
 * Атрибут — всегда строка, поэтому значение приводится по объявленному в
 * contribution `type`. Это единственная работа, которой нет у остальных
 * адаптеров: там props приходят уже типизированными.
 */

import type { IComponentDescriptor } from '@soldy/setup'
import { createInspector } from './createInspector'

export interface IAttributeBinding {
	/** Имя пропа (по общему underscorePropNaming) */
	prop: string
	type: unknown
	isBoolean: boolean
}

/** camelCase → kebab-case: `borderWidth` → `border-width` */
export function toAttributeName(propName: string): string {
	return propName.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()
}

function typesOf(type: unknown): unknown[] {
	return Array.isArray(type) ? type : [type]
}

/**
 * Карта «имя атрибута → как писать в проп».
 *
 * Строится один раз на класс: дескриптор доступен на уровне модуля, поэтому,
 * в отличие от Angular, кодогенерация не нужна.
 */
export function buildAttributeMap(descriptor: IComponentDescriptor): Map<string, IAttributeBinding> {
	const inspector = createInspector(descriptor)
	const map = new Map<string, IAttributeBinding>()

	for (const [prop, config] of Object.entries(inspector.getExportProps())) {
		const type = (config as { type?: unknown }).type

		map.set(toAttributeName(prop), {
			prop,
			type,
			isBoolean: typesOf(type).includes(Boolean),
		})
	}

	return map
}

/** Список для `static observedAttributes`. */
export function useAttributes(descriptor: IComponentDescriptor): string[] {
	return [...buildAttributeMap(descriptor).keys()]
}

/**
 * Приводит значение атрибута к типу пропа.
 *
 * Для Boolean действует HTML-семантика: значим факт наличия атрибута, а не его
 * содержимое, поэтому `disabled=""` и `disabled="false"` оба дают true, а
 * снять флаг можно только удалением атрибута.
 *
 * Возвращает `undefined`, если значение писать не нужно.
 */
export function coerceAttribute(raw: string | null, binding: IAttributeBinding): unknown {
	if (binding.isBoolean) return raw !== null

	if (raw === null) return undefined

	const types = typesOf(binding.type)

	if (types.includes(Number)) {
		const value = Number(raw)

		return Number.isNaN(value) ? undefined : value
	}

	if (types.includes(Object) && !types.includes(String)) {
		try {
			return JSON.parse(raw)
		} catch {
			return raw
		}
	}

	return raw
}
