/**
 * Мост между HTML-атрибутами и props ядра.
 *
 * Атрибут — всегда строка, поэтому значение приводится по объявленному в
 * contribution `type`. Это единственная работа, которой нет у остальных
 * адаптеров: там props приходят уже типизированными.
 */

import { TSurface, type IComponentDescriptor } from '@soldy-ui/setup'
import { WebcProfile } from './profile'

export interface IAttributeBinding {
	/** Имя пропа (по общему underscorePropNaming) */
	prop: string
	/** Тип из декларации: конструктор или массив конструкторов, порядок значим */
	type: unknown
	/** Первый тип пропа — `Boolean`: снятый атрибут значит `false`, а не «не задан» */
	isBoolean: boolean
}

/** camelCase → kebab-case: `borderWidth` → `border-width` */
export function toAttributeName(propName: string): string {
	return propName.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()
}

/**
 * Типы пропа в порядке объявления. Проп без типа принимает любое значение, как
 * во Vue, — значит, и строку атрибута как есть.
 */
function typesOf(type: unknown): readonly unknown[] {
	if (type === undefined) return [String]

	return Array.isArray(type) ? type : [type]
}

/** Разобранный JSON; не разобрался — `undefined`: из JSON его не получить. */
function parseJson(raw: string): unknown {
	try {
		return JSON.parse(raw)
	} catch {
		return undefined
	}
}

/**
 * Значение, которое тип даёт строке атрибута, или `undefined` — тип её не
 * принимает. Спутать отказ со значением нельзя: из строки `undefined` не
 * получает ни один тип.
 */
function acceptAs(type: unknown, raw: string): unknown {
	switch (type) {
		case String:
			return raw

		// HTML-семантика: значимо наличие атрибута, а не содержимое
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

/**
 * Карта «имя атрибута → как писать в проп».
 *
 * Строится один раз на класс: дескриптор доступен на уровне модуля, поэтому,
 * в отличие от Angular, кодогенерация не нужна.
 */
export function buildAttributeMap(
	descriptor: IComponentDescriptor,
): Map<string, IAttributeBinding> {
	const map = new Map<string, IAttributeBinding>()

	for (const [prop, { type }] of Object.entries(
		TSurface.of(descriptor, WebcProfile).exportProps,
	)) {
		map.set(toAttributeName(prop), {
			prop,
			type,
			isBoolean: typesOf(type)[0] === Boolean,
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
 * Типы перебираются в порядке объявления, и значение даёт первый, который
 * строку принимает:
 * - `String` — любую, как есть;
 * - `Boolean` — любую: по HTML-семантике значимо наличие атрибута, поэтому
 *   `disabled=""` и `disabled="false"` оба дают `true`;
 * - `Number` — непустую, которую разбирает `Number`;
 * - `Object` и `Array` — JSON своего вида: объект и массив.
 *
 * Спор строки и булева поэтому решает порядок, как во Vue: у полей
 * (`[String, Number, Boolean, Object, Array]`) `value="abc"` остаётся строкой,
 * а у Slider `marks` (`[Boolean, Array]`) значимо наличие. У Frame `width`
 * (`[Number, String]`) `width="240"` — число, а `width="50%"` — строка.
 *
 * Снятый атрибут у пропа, чей первый тип `Boolean`, — `false`: снять флаг
 * можно только удалением атрибута. У остальных пропсов он, как и строка,
 * которую не принял ни один тип, — `undefined`, то есть «проп не задан»:
 * заданный раньше проп связка по нему вернёт к умолчанию декларации.
 */
export function coerceAttribute(raw: string | null, binding: IAttributeBinding): unknown {
	if (raw === null) return binding.isBoolean ? false : undefined

	for (const type of typesOf(binding.type)) {
		const value = acceptAs(type, raw)

		if (value !== undefined) return value
	}

	return undefined
}
