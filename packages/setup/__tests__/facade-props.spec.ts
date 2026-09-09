/**
 * Фасад обязан уметь то, что объявил его contribution.
 *
 * Повод — настоящая ошибка, найденная при разборе фасадов: contribution
 * Accordion объявляет `mode` записываемым пропом (без `protected`), а у
 * `TAccordionCollectionFacade` сеттера не было. `<Accordion mode="multiple">`
 * молча не срабатывал — вторая раскрытая секция закрывала первую, и
 * собственный тестовый харнесс проекта всё это время проверял не то, что
 * думал. У опции Select ровно то же было с `selected`.
 *
 * Причина одна: одно и то же свойство писалось в трёх фасадах по отдельности,
 * и три копии успели дать три разных API. После выноса в базовые фасады этот
 * тест сторожит, чтобы расхождение не вернулось.
 *
 * Проверяется контракт, а не реализация: берём объявленные пропы дескриптора
 * и спрашиваем у класса, есть ли у него сеттер. `protected` пропы —
 * односторонние, ядро отдаёт их наружу, и сеттер им не нужен.
 */

import { describe, it, expect } from 'vitest'
import {
	AccordionCollectionDescriptor,
	AccordionCollectionItemDescriptor,
	ListBoxCollectionDescriptor,
	ListBoxCollectionItemDescriptor,
	SelectCollectionDescriptor,
	SelectCollectionItemDescriptor,
	TabsCollectionDescriptor,
	TabsCollectionItemDescriptor,
} from '../descriptors'

/** Ищет сеттер по всей цепочке прототипов — свойство может прийти из базы. */
function hasSetter(ctor: any, name: string): boolean {
	let proto = ctor?.prototype

	while (proto && proto !== Object.prototype) {
		const descriptor = Object.getOwnPropertyDescriptor(proto, name)

		if (descriptor) return typeof descriptor.set === 'function' || 'value' in descriptor

		proto = Object.getPrototypeOf(proto)
	}

	return false
}

const descriptors: Array<[string, () => any]> = [
	['Accordion', AccordionCollectionDescriptor],
	['Accordion.Item', AccordionCollectionItemDescriptor],
	['ListBox', ListBoxCollectionDescriptor],
	['ListBox.Item', ListBoxCollectionItemDescriptor],
	['Select', SelectCollectionDescriptor],
	['Select.Item', SelectCollectionItemDescriptor],
	['Tabs', TabsCollectionDescriptor],
	['Tabs.Item', TabsCollectionItemDescriptor],
]

describe('коллекционные фасады отвечают своему contribution', () => {
	it.each(descriptors)('%s: у каждого записываемого пропа есть сеттер', (_name, factory) => {
		const descriptor = factory()
		const writable = descriptor.props.filter((prop: any) => !prop.protected)

		const missing = writable
			// Проп с собственным `get`/`set` в декларации живёт мимо класса
			.filter((prop: any) => !prop.get && !prop.set)
			.map((prop: any) => prop.name.name as string)
			.filter((name: string) => !hasSetter(descriptor.ctor, name))

		expect(missing).toEqual([])
	})
})
