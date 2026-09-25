/**
 * Слоты: соответствие контракту и поведение.
 *
 * Contract conformance — главная цель всей затеи: слоты объявлены один раз в
 * дескрипторе, и все адаптеры обязаны реализовать ровно их. Здесь проверяется
 * Vue; остальные адаптеры проверяют себя в своих пакетах.
 *
 * Сверяется разметка каждого компонента: её слот объявлен в дескрипторе, и
 * ключи scope те же. Необъявленный слот жил бы только во Vue: React, Solid и
 * Svelte берут имена из дескриптора, и при переносе компонента такой слот не
 * попал бы в тип пропсов, а уехал бы в DOM атрибутом. Так было у Input,
 * CheckBox, Switch, Tabs.Item, Accordion.Item и DragAndDrop.
 *
 * Обратной сверки у всех нет: `default` объявлен у ComponentView и достаётся
 * каждому визуальному компоненту, в том числе тем, у кого в разметке его нет
 * (Icon, Input, CheckBox, Switch, Slider), а снять унаследованный слот
 * объявлением наследника нельзя. Ровно слоты дескриптора сверяются у
 * компонентов блока «соответствие контракту».
 */

import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join, resolve, sep } from 'node:path'
import { parse, type SFCDescriptor } from 'vue/compiler-sfc'
import { mount } from '@vue/test-utils'
import {
	AccordionDescriptor,
	AccordionItemDescriptor,
	ButtonDescriptor,
	CheckBoxDescriptor,
	ComponentViewDescriptor,
	DialogDescriptor,
	DragAndDropDescriptor,
	FrameDescriptor,
	IconDescriptor,
	InputDescriptor,
	DrawerDescriptor,
	LabelDescriptor,
	ListBoxDescriptor,
	ListBoxItemDescriptor,
	PopoverDescriptor,
	RadioGroupDescriptor,
	RadioGroupItemDescriptor,
	ScrollerDescriptor,
	SelectDescriptor,
	SelectItemDescriptor,
	SkeletonDescriptor,
	SliderDescriptor,
	SpinnerDescriptor,
	SwitchDescriptor,
	TabsContentDescriptor,
	TabsDescriptor,
	TabsItemDescriptor,
	TagsDescriptor,
	TagsItemDescriptor,
	TooltipDescriptor,
} from '@soldy-ui/setup'
import type { IComponentDescriptor } from '@soldy-ui/setup'
import { Button, ComponentView } from '@soldy-ui/vue'

const COMPONENTS = resolve(import.meta.dirname, '../src/components')

/**
 * Дескриптор каждого шаблона — слоты компонента объявляет он. У частей
 * коллекций это собственный дескриптор, а не коллекционный: фасад членства
 * слотов не объявляет. Шаблон без строки здесь роняет тест — иначе его слоты
 * прошли бы мимо контракта.
 */
const DESCRIPTORS: Readonly<Record<string, () => IComponentDescriptor>> = {
	'accordion/Accordion.vue': AccordionDescriptor,
	'accordion/item/Item.vue': AccordionItemDescriptor,
	'button/Button.vue': ButtonDescriptor,
	'check-box/CheckBox.vue': CheckBoxDescriptor,
	'component-view/ComponentView.vue': ComponentViewDescriptor,
	'dialog/Dialog.vue': DialogDescriptor,
	'drag-and-drop/DragAndDrop.vue': DragAndDropDescriptor,
	'frame/Frame.vue': FrameDescriptor,
	'icon/Icon.vue': IconDescriptor,
	'input/Input.vue': InputDescriptor,
	'label/Label.vue': LabelDescriptor,
	'list-box/ListBox.vue': ListBoxDescriptor,
	'list-box/item/Item.vue': ListBoxItemDescriptor,
	'popover/Popover.vue': PopoverDescriptor,
	'radio-group/RadioGroup.vue': RadioGroupDescriptor,
	'radio-group/item/Item.vue': RadioGroupItemDescriptor,
	'scroller/Scroller.vue': ScrollerDescriptor,
	'select/Select.vue': SelectDescriptor,
	'select/item/Item.vue': SelectItemDescriptor,
	'skeleton/Skeleton.vue': SkeletonDescriptor,
	'slider/Slider.vue': SliderDescriptor,
	'spinner/Spinner.vue': SpinnerDescriptor,
	'switch/Switch.vue': SwitchDescriptor,
	'tabs/Tabs.vue': TabsDescriptor,
	'tabs/content/Content.vue': TabsContentDescriptor,
	'tabs/item/Item.vue': TabsItemDescriptor,
	'tags/Tags.vue': TagsDescriptor,
	'tags/item/Item.vue': TagsItemDescriptor,
	'tooltip/Tooltip.vue': TooltipDescriptor,
}

/** Шаблоны компонентов — путь от `src/components`, через `/`. */
const templates = readdirSync(COMPONENTS, { recursive: true, encoding: 'utf8' })
	.filter((file) => file.endsWith('.vue'))
	.map((file) => file.split(sep).join('/'))
	.sort()

type TTemplateNode = NonNullable<NonNullable<SFCDescriptor['template']>['ast']>['children'][number]

type TElementNode = Extract<TTemplateNode, { tag: string }>

/** Место слота в разметке: имя и ключи scope — привязки `<slot>`, кроме имени. */
interface ISlotOutlet {
	name: string
	scope: string[]
}

/**
 * Имя и scope одного `<slot>`. Scope, состав которого не прочитать, — спред
 * `v-bind="…"` или вычисляемый ключ, — роняет тест, как и динамическое имя:
 * его резолвит только Vue (AGENTS.md, «Слоты элементов: статические имена со
 * scope»).
 */
function outletOf(file: string, element: TElementNode): ISlotOutlet {
	const outlet: ISlotOutlet = { name: 'default', scope: [] }

	for (const prop of element.props) {
		if (!('arg' in prop)) {
			if (prop.name === 'name' && prop.value) outlet.name = prop.value.content
			continue
		}

		// `v-if`, `v-else`, `v-show` — не данные слота
		if (prop.name !== 'bind') continue

		if (!prop.arg || !('isStatic' in prop.arg) || !prop.arg.isStatic) {
			throw new Error(`${file}: у <slot> привязка «${prop.loc.source}», scope не прочитать`)
		}

		if (prop.arg.content === 'name') throw new Error(`${file}: динамическое имя слота`)

		outlet.scope.push(prop.arg.content)
	}

	outlet.scope.sort()

	return outlet
}

/**
 * Слоты разметки `.vue` в порядке появления, по одному на каждый `<slot>`:
 * один слот бывает нарисован в нескольких местах. Разметку читает компилятор
 * Vue, а не регулярное выражение: привязка в атрибуте может содержать `>`.
 */
function outletsOf(source: string, file: string): ISlotOutlet[] {
	const { descriptor, errors } = parse(source, { filename: file })

	expect(errors).toEqual([])

	const ast = descriptor.template?.ast

	if (!ast) throw new Error(`${file}: нет <template>`)

	const outlets: ISlotOutlet[] = []
	const visit = (nodes: readonly TTemplateNode[]): void => {
		for (const node of nodes) {
			if (!('tag' in node)) continue
			if (node.tag === 'slot') outlets.push(outletOf(file, node))

			visit(node.children)
		}
	}

	visit(ast.children)

	return outlets
}

/** Слоты шаблона компонента — путь от `src/components`. */
function templateOutlets(file: string): ISlotOutlet[] {
	return outletsOf(readFileSync(join(COMPONENTS, file), 'utf8'), file)
}

/** Имена слотов, реально объявленные в разметке .vue-файла. */
function templateSlots(file: string): string[] {
	return [...new Set(templateOutlets(file).map((outlet) => outlet.name))].sort()
}

describe('разбор разметки', () => {
	it('имя — из атрибута name, scope — привязки; директивы и вложенность не мешают', () => {
		const source = `<template>
			<span v-if="count > 0"><slot name="leading" :text="text" :item="item" /></span>
			<slot v-else />
		</template>`

		expect(outletsOf(source, 'probe.vue')).toEqual([
			{ name: 'leading', scope: ['item', 'text'] },
			{ name: 'default', scope: [] },
		])
	})

	it('состав scope, которого не прочитать, — ошибка, а не пустой scope', () => {
		expect(() =>
			outletsOf('<template><slot v-bind="scope" /></template>', 'probe.vue'),
		).toThrow('scope не прочитать')
		expect(() =>
			outletsOf('<template><slot :[key]="value" /></template>', 'probe.vue'),
		).toThrow('scope не прочитать')
	})

	it('динамическое имя слота — ошибка', () => {
		expect(() => outletsOf('<template><slot :name="name" /></template>', 'probe.vue')).toThrow(
			'динамическое имя слота',
		)
	})
})

describe('соответствие контракту', () => {
	it('Button: разметка объявляет ровно слоты дескриптора', () => {
		expect(templateSlots('button/Button.vue')).toEqual(
			ButtonDescriptor()
				.slots.map((slot) => slot.name)
				.sort(),
		)
	})

	it('ComponentView: то же для одного слота по умолчанию', () => {
		expect(templateSlots('component-view/ComponentView.vue')).toEqual(
			ComponentViewDescriptor()
				.slots.map((slot) => slot.name)
				.sort(),
		)
	})

	it('Dialog: заголовок, содержимое, подвал и иконки кнопок шапки', () => {
		expect(templateSlots('dialog/Dialog.vue')).toEqual(
			DialogDescriptor()
				.slots.map((slot) => slot.name)
				.sort(),
		)
	})

	it('Drawer: заголовок, содержимое, подвал и иконка крестика', () => {
		expect(templateSlots('src/components/drawer/Drawer.vue')).toEqual(
			DrawerDescriptor()
				.slots.map((slot) => slot.name)
				.sort(),
		)
	})

	it('Label: контрол в default и текст в content', () => {
		expect(templateSlots('label/Label.vue')).toEqual(
			LabelDescriptor()
				.slots.map((slot) => slot.name)
				.sort(),
		)
	})

	it('Popover: триггер, содержимое панели и иконка крестика', () => {
		expect(templateSlots('popover/Popover.vue')).toEqual(
			PopoverDescriptor()
				.slots.map((slot) => slot.name)
				.sort(),
		)
	})

	it('Tags: слоты тегов и значок кнопки «…»', () => {
		expect(templateSlots('tags/Tags.vue')).toEqual(
			TagsDescriptor()
				.slots.map((slot) => slot.name)
				.sort(),
		)
	})

	it('Tooltip: триггер и текст подсказки', () => {
		expect(templateSlots('tooltip/Tooltip.vue')).toEqual(
			TooltipDescriptor()
				.slots.map((slot) => slot.name)
				.sort(),
		)
	})
})

describe('каждый слот разметки объявлен в дескрипторе', () => {
	it('у каждого шаблона компонента есть дескриптор, и лишних строк нет', () => {
		expect(Object.keys(DESCRIPTORS).sort()).toEqual(templates)
	})

	it.each(templates)('%s', (file) => {
		const descriptor = DESCRIPTORS[file]

		if (!descriptor) throw new Error(`${file}: нет строки в таблице «шаблон → дескриптор»`)

		const declared = new Map(
			descriptor().slots.map((slot) => [slot.name, Object.keys(slot.scope ?? {}).sort()]),
		)
		const outlets = templateOutlets(file)

		// Каждое место слота — с его именем: необъявленный слот даёт `undefined`
		expect(outlets.map(({ name }) => [name, declared.get(name)])).toEqual(
			outlets.map(({ name, scope }) => [name, scope]),
		)
	})
})

describe('поведение слотов Button', () => {
	it('leading ставится перед текстом, trailing — после', () => {
		const wrapper = mount(Button, {
			props: { text: 'Mid' },
			slots: { leading: '<i>L</i>', trailing: '<i>T</i>' },
		})

		expect(wrapper.element.textContent).toBe('LMidT')
	})

	it('содержимое default переопределяет text', () => {
		const wrapper = mount(Button, {
			props: { text: 'ignored' },
			slots: { default: '<b>Custom</b>' },
		})

		expect(wrapper.find('.s-button__text').text()).toBe('Custom')
	})

	it('слот default получает scope с text', () => {
		const wrapper = mount(Button, {
			props: { text: 'Scoped' },
			slots: { default: '<template #default="{ text }"><b>{{ text }}!</b></template>' },
		})

		expect(wrapper.find('.s-button__text').text()).toBe('Scoped!')
	})

	it('без слота показывается text из props', () => {
		const wrapper = mount(Button, { props: { text: 'Fallback' } })

		expect(wrapper.find('.s-button__text').text()).toBe('Fallback')
	})
})

describe('поведение слотов ComponentView', () => {
	it('содержимое попадает в корень', () => {
		const wrapper = mount(ComponentView, { slots: { default: '<b>Inner</b>' } })

		expect(wrapper.find('b').text()).toBe('Inner')
	})
})

describe('слот не ограничивает содержимое', () => {
	/**
	 * `scope` в объявлении слота — данные, которые компонент передаёт ВНУТРЬ
	 * (`v-slot="{ text }"`), а не тип содержимого. Положить можно что угодно:
	 * кнопка остаётся кнопкой, клик и семантика не меняются.
	 */
	it('в default можно положить целую таблицу', () => {
		const wrapper = mount(Button, {
			props: { text: 'ignored' },
			slots: {
				default: '<table><tbody><tr><td>ячейка</td></tr></tbody></table>',
			},
		})

		expect(wrapper.find('.s-button__text table td').text()).toBe('ячейка')
		// Компонент не перестал быть кнопкой
		expect(wrapper.element.tagName.toLowerCase()).toBe('button')
	})

	it('scope доступен и при произвольной разметке', () => {
		const wrapper = mount(Button, {
			props: { text: 'Заголовок' },
			slots: {
				default: '<template #default="{ text }"><ul><li>{{ text }}</li></ul></template>',
			},
		})

		expect(wrapper.find('.s-button__text li').text()).toBe('Заголовок')
	})

	it('в leading и trailing тоже произвольная разметка', () => {
		const wrapper = mount(Button, {
			props: { text: 'Mid' },
			slots: { leading: '<svg><circle /></svg>', trailing: '<div><p>блок</p></div>' },
		})

		expect(wrapper.find('svg circle').exists()).toBe(true)
		expect(wrapper.find('p').text()).toBe('блок')
	})
})
