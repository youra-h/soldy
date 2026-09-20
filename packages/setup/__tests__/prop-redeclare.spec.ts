/**
 * Переобъявление пропа: наследник пишет только то, что меняет.
 *
 * Поверхность наследника не обязана быть надмножеством родительской. Элементу
 * коллекции размер и вид диктует владелец, радио — имя в форме и вид диктует
 * группа: значение приходит не из разметки, а вход у разметки всё равно был и
 * обещал то, чего нет. Снять его можно только там, где проп объявлен, —
 * в дескрипторе, и не у родителя: у самого `Stylable` `size` законный вход.
 *
 * Механика одна на оба случая и на все будущие: своё объявление ложится на
 * одноимённое родительское — тем же правилом, что слот и плагин
 * (`inheritDeclarations`), — и переобъявляет ровно написанные факты
 * (`TPropSpec.inheritFrom`), а имена, объявленные защищёнными, вычитаются из
 * типа пропсов (`DescriptorProps`). Рантайм и тип поэтому меняются одним
 * объявлением, и сторож состава (`descriptor-props-types.spec.ts`) их сводит
 * без правок.
 *
 * Типовые проверки — `expectTypeOf` и `@ts-expect-error`: файл проверяет шаг CI
 * «Типы — Setup», и неиспользованная директива роняет его так же, как
 * настоящая ошибка.
 */

import { describe, it, expect, expectTypeOf } from 'vitest'
import {
	AccordionItemDescriptor,
	ButtonDescriptor,
	ListBoxItemDescriptor,
	RadioGroupItemDescriptor,
	SelectItemDescriptor,
	StylableDescriptor,
	TabsItemDescriptor,
	TagsItemDescriptor,
	defineComponent,
	TSurface,
	underscorePropNaming,
} from '@soldy/setup'
import type {
	DescriptorProps,
	IAdapterProfile,
	IComponentDescriptor,
	IDeclaration,
} from '@soldy/setup'
import { TListBoxItem } from '@soldy/core'
import type { IListBoxItemProps, IRadioGroupItemProps } from '@soldy/core'
import { inheritDeclarations } from '../define/inherit'
import { OWNER_STYLE_PROPS } from '../descriptors/components/stylable.descriptor'
import { required } from './helpers'

/** Имена событий ядра как есть — так их отдают наружу Vue и Web Components. */
const RawProfile: IAdapterProfile = {
	naming: { prop: underscorePropNaming, event: (name) => name.getName() },
}

/** Что разметка может задать: статический слой поверхности. */
const inputs = (descriptor: IComponentDescriptor): string[] =>
	Object.keys(TSurface.of(descriptor, RawProfile).exportProps)

/** Всё, что дескриптор объявил, — в порядке объявления. */
const declared = (descriptor: IComponentDescriptor): string[] =>
	descriptor.props.map((prop) => prop.name.name)

const propOf = (descriptor: IComponentDescriptor, name: string) =>
	required(
		descriptor.props.find((prop) => prop.name.name === name),
		`проп ${name}`,
	)

/**
 * Классы стенда — не сущности ядра: здесь проверяется слияние деклараций, а
 * типы пропсов выводятся из интерфейса `IEntity` и сверяются ниже, на
 * настоящих дескрипторах.
 */
class TOwner {
	static readonly defaultValues = { size: 'medium', text: '' }
	size = 'medium'
	text = ''
}

/** Тот же состав, но умолчания размера у класса нет: наследник вправе его не иметь. */
class THeir {
	static readonly defaultValues = { text: '' }
	size = 'medium'
	text = ''
}

const OwnerDescriptor = defineComponent({
	ctor: TOwner,
	contribution: {
		props: {
			size: { type: String, triggers: ['change:size'] },
			text: { type: String, triggers: ['change:text'] },
		},
	},
})

/** Наследник переобъявляет один факт: размер ему задаёт владелец. */
const HeirDescriptor = defineComponent({
	ctor: THeir,
	extends: OwnerDescriptor,
	contribution: { props: { size: { protected: true } } },
})

describe('правило наследования одно на все категории объявлений', () => {
	/** Объявление стенда: «поверх» для него — запомнить, на чём оно лежит. */
	class TCounted implements IDeclaration<TCounted> {
		constructor(
			readonly key: string,
			readonly depth = 0,
		) {}

		inheritFrom(base: TCounted): TCounted {
			return new TCounted(this.key, base.depth + 1)
		}
	}

	it('одноимённое остаётся на месте родительского, новое встаёт следом', () => {
		const result = inheritDeclarations(
			[new TCounted('a'), new TCounted('b')],
			[new TCounted('b'), new TCounted('c')],
		)

		expect(result.map((declaration) => declaration.key)).toEqual(['a', 'b', 'c'])
		// Сложило объявление само: функция о нём ничего не знает
		expect(result.map((declaration) => declaration.depth)).toEqual([0, 1, 0])
	})

	it('ключ у трёх категорий свой: полное имя, имя слота, класс плагина', () => {
		const descriptor = ButtonDescriptor()
		const prop = propOf(descriptor, 'text')
		const slot = required(
			descriptor.slots.find((declaration) => declaration.name === 'default'),
			'слот default',
		)
		const plugin = required(descriptor.plugins[0], 'плагин дескриптора')

		expect(prop.key).toBe(prop.name.getName())
		expect(slot.key).toBe('default')
		expect(plugin.key).toBe(plugin.ctor)
	})

	it('слот наследника заменяет родительский целиком', () => {
		const slot = required(
			ButtonDescriptor().slots.find((declaration) => declaration.name === 'default'),
			'слот default',
		)

		expect(slot.inheritFrom()).toBe(slot)
	})
})

describe('своё объявление пропа ложится на одноимённое родительское', () => {
	it('второго пропа с тем же именем не появляется, место остаётся родительским', () => {
		expect(declared(OwnerDescriptor)).toEqual(['size', 'text'])
		expect(declared(HeirDescriptor)).toEqual(['size', 'text'])
	})

	it('ненаписанные факты остаются родительскими', () => {
		const size = propOf(HeirDescriptor, 'size')

		expect(size.protected).toBe(true)
		expect(size.type).toBe(String)
		expect(size.triggers?.map((trigger) => trigger.name)).toEqual(['change:size'])
	})

	it('умолчание пересчитывается от своего класса, а не переезжает с описанием', () => {
		expect(Object.hasOwn(propOf(OwnerDescriptor, 'size'), 'default')).toBe(true)
		expect(Object.hasOwn(propOf(HeirDescriptor, 'size'), 'default')).toBe(false)
	})

	it('родительское описание не меняется: его делят все наследники', () => {
		expect(propOf(OwnerDescriptor, 'size').protected).toBe(false)
		expect(inputs(OwnerDescriptor)).toContain('size')
	})
})

describe('защищённое переобъявление снимает вход, а не свойство', () => {
	it('разметка задать не может', () => {
		expect(inputs(HeirDescriptor)).toEqual(['text'])
	})

	it('значение остаётся в состоянии, и событие о смене публикуется', () => {
		const surface = TSurface.of(HeirDescriptor, RawProfile)

		expect(surface.props.map((prop) => prop.exportName)).toContain('size')
		expect(surface.exportEvents).toContain('change:size')
	})
})

describe('переобъявление ходит в обе стороны', () => {
	/** Внук возвращает вход: объявление без `protected` — это «объявлено входом». */
	const GrandchildDescriptor = defineComponent({
		ctor: THeir,
		extends: HeirDescriptor,
		contribution: { props: { size: { protected: false } } },
	})

	/** То же на настоящем классе ядра: у него есть интерфейс пропсов, и виден тип. */
	const OpenedItemDescriptor = defineComponent({
		ctor: TListBoxItem,
		extends: ListBoxItemDescriptor(),
		contribution: { props: { size: { protected: false } } },
	})

	it('в рантайме проп снова входной', () => {
		expect(propOf(GrandchildDescriptor, 'size').protected).toBe(false)
		expect(inputs(GrandchildDescriptor)).toContain('size')
		expect(inputs(OpenedItemDescriptor)).toContain('size')
	})

	it('в типах имя возвращается в пропсы', () => {
		expectTypeOf<DescriptorProps<typeof OpenedItemDescriptor>>().toHaveProperty('size')
	})
})

describe('элементы коллекций: размер и вид задаёт владелец', () => {
	const items: Array<[string, () => IComponentDescriptor]> = [
		['ListBox.Item', ListBoxItemDescriptor],
		['Select.Item', SelectItemDescriptor],
		['Tabs.Item', TabsItemDescriptor],
		['Accordion.Item', AccordionItemDescriptor],
		['Tags.Item', TagsItemDescriptor],
		['RadioGroup.Item', RadioGroupItemDescriptor],
	]

	it.each(items)('%s: в разметке ни size, ни variant', (_name, factory) => {
		const descriptor = factory()

		expect(inputs(descriptor)).not.toContain('size')
		expect(inputs(descriptor)).not.toContain('variant')
		// Значение живёт: тема читает модификаторы, шаблон — сам проп
		expect(declared(descriptor)).toEqual(expect.arrayContaining(['size', 'variant']))
		expect(TSurface.of(descriptor, RawProfile).exportEvents).toContain('change:size')
	})

	it('у самого Stylable оба входа на месте', () => {
		expect(inputs(StylableDescriptor())).toEqual(expect.arrayContaining(['size', 'variant']))
	})

	it('в типах пропсов элемента их нет, в интерфейсе ядра есть', () => {
		type TItemProps = DescriptorProps<typeof ListBoxItemDescriptor>

		// @ts-expect-error — размер пункта диктует список
		const size: keyof TItemProps = 'size'
		// @ts-expect-error — вид пункта диктует список
		const variant: keyof TItemProps = 'variant'
		const text: keyof TItemProps = 'text'

		expect([size, variant, text]).toEqual(['size', 'variant', 'text'])
		expectTypeOf<IListBoxItemProps>().toHaveProperty('size')
		expectTypeOf<IListBoxItemProps>().toHaveProperty('variant')
	})
})

describe('радио: вид и имя в форме задаёт группа', () => {
	it('в разметке их нет, а значение и события остаются', () => {
		const descriptor = RadioGroupItemDescriptor()
		const surface = TSurface.of(descriptor, RawProfile)

		expect(inputs(descriptor)).not.toContain('view')
		expect(inputs(descriptor)).not.toContain('name')
		expect(inputs(descriptor)).toContain('value')

		expect(surface.props.map((prop) => prop.exportName)).toEqual(
			expect.arrayContaining(['view', 'name']),
		)
		expect(surface.exportEvents).toEqual(expect.arrayContaining(['change:view', 'change:name']))
	})

	it('в типах пропсов их нет, в интерфейсе ядра есть', () => {
		type TRadioProps = DescriptorProps<typeof RadioGroupItemDescriptor>

		// @ts-expect-error — вид радио задаёт группа
		const view: keyof TRadioProps = 'view'
		// @ts-expect-error — имя в форме общее на группу
		const name: keyof TRadioProps = 'name'
		const value: keyof TRadioProps = 'value'

		expect([view, name, value]).toEqual(['view', 'name', 'value'])
		expectTypeOf<IRadioGroupItemProps>().toHaveProperty('view')
		expectTypeOf<IRadioGroupItemProps>().toHaveProperty('name')
	})
})

describe('общий фрагмент объявлен литералом', () => {
	/**
	 * `protected` у фрагмента обязан выводиться литералом `true`: с `boolean`
	 * рантайм вход снимет, а тип — нет, и сторож состава разойдётся с
	 * рантаймом. Сверка тут, а не только в CI типов: фрагмент — один на шесть
	 * элементов.
	 */
	it('protected у OWNER_STYLE_PROPS — литерал true', () => {
		expectTypeOf(OWNER_STYLE_PROPS.size.protected).toEqualTypeOf<true>()
		expectTypeOf(OWNER_STYLE_PROPS.variant.protected).toEqualTypeOf<true>()
		expect(Object.keys(OWNER_STYLE_PROPS)).toEqual(['size', 'variant'])
	})
})
