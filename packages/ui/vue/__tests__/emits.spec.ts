/**
 * Объявленные emits обязаны покрывать то, что компонент действительно эмитит.
 *
 * Повод — предупреждение, найденное стендом на первом же запуске:
 * «Component emitted event "update:anchor_anchor" but it is neither declared
 * in the emits option nor as an "onUpdate:anchor_anchor" prop».
 *
 * Причина была в расхождении наборов. `useEmits` перечислял `descriptor.props`
 * — только собственные пропы компонента, — а `useSyncEvents` эмитит `update:`
 * по `accessor.getProps(false)`, куда входят и плагинные. Проп при этом был
 * объявлен: `useProps` строится через инспектор, а тот собран из `getProps()`.
 * То есть проп принимался, но его обратная связь считалась незадекларированной.
 *
 * Ошибка тихая: Vue пишет в консоль, `v-model` на таком пропе не работает, и в
 * тестах это никак не всплывает. Поэтому проверка идёт от контракта: набор
 * emits сверяется с полным набором пропов, а не с тем, что удобно перечислить.
 */

import { describe, it, expect } from 'vitest'
import {
	AccordionDescriptor,
	ButtonDescriptor,
	CheckBoxDescriptor,
	ComponentViewDescriptor,
	DragAndDropDescriptor,
	FrameDescriptor,
	IconDescriptor,
	InputDescriptor,
	ListBoxDescriptor,
	SelectDescriptor,
	SkeletonDescriptor,
	SpinnerDescriptor,
	SwitchDescriptor,
	TabsDescriptor,
} from '@soldy/setup'
import type { IComponentDescriptor } from '@soldy/setup'
import { useEmits, createInspector } from '../src/adapter'

const DESCRIPTORS: Array<[string, () => IComponentDescriptor]> = [
	['Accordion', AccordionDescriptor],
	['Button', ButtonDescriptor],
	['CheckBox', CheckBoxDescriptor],
	['ComponentView', ComponentViewDescriptor],
	['DragAndDrop', DragAndDropDescriptor],
	['Frame', FrameDescriptor],
	['Icon', IconDescriptor],
	['Input', InputDescriptor],
	['ListBox', ListBoxDescriptor],
	['Select', SelectDescriptor],
	['Skeleton', SkeletonDescriptor],
	['Spinner', SpinnerDescriptor],
	['Switch', SwitchDescriptor],
	['Tabs', TabsDescriptor],
]

describe('useEmits покрывает все update:', () => {
	it.each(DESCRIPTORS)('%s', (_name, factory) => {
		const descriptor = factory()
		const inspector = createInspector(descriptor)
		const emits = new Set(useEmits(descriptor))

		// Ровно тот набор, по которому `useSyncEvents` вешает эмиттеры:
		// непротектед-пропы с триггерами, включая плагинные
		const expected = descriptor
			.getProps()
			.filter((prop) => !prop.protected && (prop.triggers?.length ?? 0) > 0)
			.map((prop) => `update:${inspector.getExportPropName(prop)}`)

		expect(expected.filter((name) => !emits.has(name))).toEqual([])
	})

	/**
	 * Отдельно и поимённо — тот самый проп, с которого всё началось. Общая
	 * проверка выше сломается и при другой причине, а этот случай стоит держать
	 * названным: якорь у Frame приходит от плагина, а не от компонента.
	 */
	it('Frame объявляет update: для плагинного пропа якоря', () => {
		expect(useEmits(FrameDescriptor())).toContain('update:anchor_anchor')
	})
})
