/**
 * Умолчание пропа в статическом слое: `getExportProps` берёт его из декларации.
 *
 * Значим ключ, а не значение. `default: undefined` — тоже объявленное
 * умолчание: по нему Vue не приводит отсутствующий Boolean-проп к `false`
 * (`value` у `TValueControl`, наследуемый `closable` у элемента Tabs).
 */

import { describe, it, expect } from 'vitest'
import { TDescriptorInspector } from '../descriptor-inspector.class'
import { TName } from '../contract'

describe('getExportProps — умолчание из декларации', () => {
	it('без ключа в декларации default в конфиге нет', () => {
		const inspector = new TDescriptorInspector([{ name: new TName('text'), type: String }], [])
		const config = inspector.getExportProps().text

		expect(config).toEqual({ type: String })
		expect(Object.hasOwn(config, 'default')).toBe(false)
	})

	it('значение из декларации уходит в конфиг под экспортным именем', () => {
		const inspector = new TDescriptorInspector(
			[{ name: new TName('flip', 'anchor'), type: Boolean, default: true }],
			[],
		)

		expect(inspector.getExportProps()['anchor:flip']).toEqual({ type: Boolean, default: true })
	})

	it('ключ со значением undefined сохраняется', () => {
		const inspector = new TDescriptorInspector(
			[{ name: new TName('closable'), type: Boolean, default: undefined }],
			[],
		)
		const config = inspector.getExportProps().closable

		expect(Object.hasOwn(config, 'default')).toBe(true)
		expect(config.default).toBeUndefined()
	})

	it('protected-проп наружу не уходит вместе с умолчанием', () => {
		const inspector = new TDescriptorInspector(
			[{ name: new TName('present'), type: Boolean, protected: true, default: true }],
			[],
		)

		expect(inspector.getExportProps()).toEqual({})
	})
})
