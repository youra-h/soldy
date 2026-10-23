/**
 * Атрибуты и пропсы ядра. Атрибут — всегда строка, и значение приводится по
 * `type` декларации: типы по порядку, значение даёт первый, который строку
 * принимает, — спор строки и булева решает порядок, как во Vue. Снятый
 * атрибут у булева пропа — `false`, у остальных — «проп не задан».
 */

import { TSurface, type IComponentDescriptor } from '@soldy-ui/setup'
import { WebcProfile } from './profile'

export interface IAttributeBinding {
	prop: string
	/** Конструктор или массив конструкторов, порядок значим. */
	type: unknown
	isBoolean: boolean
}

/** Пропы без атрибута и свойства: тег корня задан разметкой, база отдаёт ядру `localName`. */
export const HOST_PROPS = ['tag'] as const

export type THostProp = (typeof HOST_PROPS)[number]

const HOST_PROP_NAMES: ReadonlySet<string> = new Set(HOST_PROPS)

export function isHostProp(prop: string): boolean {
	return HOST_PROP_NAMES.has(prop)
}

/** `borderWidth` → `border-width`. */
export function toAttributeName(propName: string): string {
	return propName.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()
}

/** Проп без типа принимает строку атрибута как есть. */
function typesOf(type: unknown): readonly unknown[] {
	if (type === undefined) return [String]

	return Array.isArray(type) ? type : [type]
}

function parseJson(raw: string): unknown {
	try {
		return JSON.parse(raw)
	} catch {
		return undefined
	}
}

/** `undefined` — тип строку не принимает: из строки его не даёт ни один тип. */
function acceptAs(type: unknown, raw: string): unknown {
	switch (type) {
		case String:
			return raw

		// Значимо наличие атрибута: `disabled="false"` — тоже `true`
		case Boolean:
			return true

		case Number: {
			// Пустую строку `Number` разобрал бы в 0
			if (raw.trim() === '') return undefined

			const value = Number(raw)

			return Number.isNaN(value) ? undefined : value
		}

		case Object: {
			const value = parseJson(raw)

			return typeof value === 'object' && value !== null && !Array.isArray(value)
				? value
				: undefined
		}

		case Array: {
			const value = parseJson(raw)

			return Array.isArray(value) ? value : undefined
		}

		default:
			return undefined
	}
}

/** Имя атрибута → проп; один раз на класс, кодогенерация не нужна. */
export function buildAttributeMap(
	descriptor: IComponentDescriptor,
): Map<string, IAttributeBinding> {
	const map = new Map<string, IAttributeBinding>()

	for (const [prop, { type }] of Object.entries(
		TSurface.of(descriptor, WebcProfile).exportProps,
	)) {
		if (isHostProp(prop)) continue

		map.set(toAttributeName(prop), {
			prop,
			type,
			isBoolean: typesOf(type)[0] === Boolean,
		})
	}

	return map
}

export function coerceAttribute(raw: string | null, binding: IAttributeBinding): unknown {
	if (raw === null) return binding.isBoolean ? false : undefined

	for (const type of typesOf(binding.type)) {
		const value = acceptAs(type, raw)

		if (value !== undefined) return value
	}

	return undefined
}
