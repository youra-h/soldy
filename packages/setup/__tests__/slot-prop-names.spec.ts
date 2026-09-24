/**
 * Сторож: имя слота не совпадает с именем входа.
 *
 * В React, Solid и Svelte слот — это проп компонента. Слот, названный как
 * проп, сливается с ним: тип сужается до значения пропа — у слота `text`
 * подписи это была бы строка, и разметку в него не передать, — а строка
 * уходит и в ядро, и в слот, то есть к тексту ведут два пути. Во Vue, Angular
 * и Web Components слоты и пропсы разведены по разным пространствам имён, и
 * совпадение там не видно — поэтому стережёт тест, а не ревью. Так жил слот
 * `text` у Label до переименования в `content` (AGENTS.md, «Слоты — третья
 * категория контракта»).
 *
 * Входы — незащищённые пропсы дескриптора, свои и плагинов, в именах профиля
 * с колбэк-событиями (`aria_label`), а слот `default` там — `children`.
 * Защищённые пропсы не сверяются: входа у них нет, и в пропсы React, Solid и
 * Svelte они не попадают. Перебираются все дескрипторы экспорта, новый попадёт
 * под проверку сам.
 */

import { describe, it, expect } from 'vitest'
import { ButtonDescriptor, LabelDescriptor } from '../content/descriptors'
import { defineComponent } from '../protected/define'
import type { IComponentDescriptor } from '../protected/define'
import { TSurface, slotNames } from '../protected/adapter'
import { CallbackProfile, exportedDescriptors } from './helpers'

/** Слоты дескриптора, чьи имена в пропсах React, Solid и Svelte заняты входом. */
function collisions(descriptor: IComponentDescriptor): string[] {
	const inputs = Object.keys(TSurface.of(descriptor, CallbackProfile).exportProps)

	return slotNames(descriptor, CallbackProfile.defaultSlot).filter((slot) =>
		inputs.includes(slot),
	)
}

/** Наследник с одним лишним слотом — проверка самой сверки. */
const withSlot = (base: IComponentDescriptor, slot: string) =>
	defineComponent({ extends: base, contribution: { slots: { [slot]: {} } } })

describe('сторож: имя слота не совпадает с именем входа', () => {
	describe('сверка', () => {
		it('ловит слот с именем своего пропа', () => {
			expect(collisions(withSlot(LabelDescriptor(), 'text'))).toEqual(['text'])
		})

		it('ловит слот с именем пропа плагина', () => {
			expect(collisions(withSlot(ButtonDescriptor(), 'aria_label'))).toEqual(['aria_label'])
		})

		it('защищённый проп входом не считает', () => {
			expect(collisions(withSlot(ButtonDescriptor(), 'classes'))).toEqual([])
		})
	})

	it('Label: текст подписи — слот content, рядом с пропом text', () => {
		expect(slotNames(LabelDescriptor())).toEqual(['default', 'content'])
		expect(collisions(LabelDescriptor())).toEqual([])
	})

	it.each(exportedDescriptors())('%s', (_name, descriptor) => {
		expect(collisions(descriptor)).toEqual([])
	})
})
