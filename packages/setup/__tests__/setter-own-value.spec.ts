// @vitest-environment jsdom

/**
 * Сторож: то же ли это значение, решает сеттер — и повторная запись молчит.
 *
 * Обмен пишет в ядро всё, что до него дошло (`TLine.write`): повтор рендера
 * гасит ячейка входа, а сверку со своим значением делает сеттер владельца.
 * Сверять с геттером обмен не может — у свойства с резольвером геттер отдаёт
 * итог (`disabled` элемента — своё или владельца, прижатое `value` Slider), и
 * значение, равное итогу, но не своему, терялось. Значит, сеттер без сверки
 * теперь виден: эхо модели (`update:value` вернулся тем же массивом) или
 * `items` тем же составом слали бы второй триггер, пересобирали коллекцию или
 * снова выбирали выбранное.
 *
 * Правило поэтому проверяется здесь, по всем дескрипторам экспорта: каждому
 * незащищённому пропу с триггерами — своему и плагинному — пишется его же
 * значение, составное — новым объектом, как литерал разметки, и триггеры
 * молчат. Булев проп сначала переключается: выбрать выбранное и активировать
 * активное — тоже повтор. Фасадам коллекций нужен владелец и состав — их
 * собирает таблица `COLLECTIONS`, фасад без строки в ней роняет сторож.
 */

import { describe, it, expect } from 'vitest'
import {
	TAccordion,
	TAccordionCollectionFacade,
	TAccordionItemCollectionFacade,
	TCollectionComponent,
	TCollectionItemComponent,
	TEvented,
	TItemContextRegistry,
	TListBox,
	TListBoxCollectionFacade,
	TListBoxItemCollectionFacade,
	TRadioGroup,
	TRadioGroupCollectionFacade,
	TRadioGroupItemCollectionFacade,
	TSelect,
	TSelectCollectionFacade,
	TSelectItemCollectionFacade,
	TTabs,
	TTabsCollectionFacade,
	TTabsItemCollectionFacade,
	TTags,
	TTagsCollectionFacade,
	TTagsItemCollectionFacade,
} from '@soldy-ui/core'
import { createAdapterContext } from '../protected/adapter'
import type { IComponentDescriptor, TPropSpec } from '../protected/define'
import { exportedDescriptors, required } from './helpers'

/** Пропы, которые пишет разметка: незащищённые, с триггерами. */
const writtenByMarkup = (props: readonly TPropSpec[]) =>
	props.filter((spec) => !spec.protected && spec.triggers.length > 0)

/** Составное значение — новым объектом того же состава, как литерал разметки. */
function copyOf(value: unknown): unknown {
	if (Array.isArray(value)) return [...value]

	if (
		typeof value === 'object' &&
		value !== null &&
		Object.getPrototypeOf(value) === Object.prototype
	) {
		return { ...value }
	}

	return value
}

/**
 * Записать владельцу пропа его же значение и вернуть триггеры, которые
 * сработали. Булев проп сначала переключается — до подписки.
 */
function rewrite(spec: TPropSpec, owner: object): string[] {
	const current = spec.read(owner)

	if (typeof current === 'boolean') spec.assign(owner, !current)

	const bus: unknown = Reflect.get(owner, 'events')

	if (!(bus instanceof TEvented)) return []

	const fired: string[] = []
	const off = spec.triggers.map((trigger) => {
		const handler = () => fired.push(trigger.name)

		bus.on(trigger.name, handler)

		return () => bus.off(trigger.name, handler)
	})

	spec.assign(owner, copyOf(spec.read(owner)))
	off.forEach((unsubscribe) => unsubscribe())

	return fired.map((name) => `${spec.name.getName()}: ${name}`)
}

/** Фасад владельца коллекции с двумя элементами и фасад первого элемента в ней. */
type TMountedCollection = {
	readonly facade: TCollectionComponent<any, any, any>
	readonly itemFacade: TCollectionItemComponent<any, any, any>
}

/** Первый элемент состава — в контекст фасада элемента, как это делает регистрация. */
function withItem<T extends TCollectionItemComponent<any, any, any>>(
	facade: TCollectionComponent<any, any, any>,
	itemFacade: T,
): TMountedCollection {
	const registry = new TItemContextRegistry(facade.engine.getCore())

	itemFacade.setContext(
		registry.get(required(facade.engine.extensions.batch.items[0], 'элемент')),
	)

	return { facade, itemFacade }
}

const SOURCES = [
	{ value: 'a', text: 'A' },
	{ value: 'b', text: 'B' },
]

/**
 * Коллекции экспорта: фасад владельца над своим владельцем и составом — ключ
 * по дескриптору фасада владельца, фасад элемента — по дескриптору элемента.
 */
const COLLECTIONS: Readonly<Record<string, readonly [string, () => TMountedCollection]>> = {
	AccordionCollectionDescriptor: [
		'AccordionCollectionItemDescriptor',
		() => {
			const facade = new TAccordionCollectionFacade({}, { owner: new TAccordion() })

			facade.items = SOURCES

			return withItem(facade, new TAccordionItemCollectionFacade())
		},
	],
	ListBoxCollectionDescriptor: [
		'ListBoxCollectionItemDescriptor',
		() => {
			const facade = new TListBoxCollectionFacade({}, { owner: new TListBox() })

			facade.items = SOURCES

			return withItem(facade, new TListBoxItemCollectionFacade())
		},
	],
	RadioGroupCollectionDescriptor: [
		'RadioGroupCollectionItemDescriptor',
		() => {
			const facade = new TRadioGroupCollectionFacade({}, { owner: new TRadioGroup() })

			facade.items = SOURCES.map(({ value }) => ({ value }))

			return withItem(facade, new TRadioGroupItemCollectionFacade())
		},
	],
	SelectCollectionDescriptor: [
		'SelectCollectionItemDescriptor',
		() => {
			const facade = new TSelectCollectionFacade({}, { owner: new TSelect() })

			facade.items = SOURCES

			return withItem(facade, new TSelectItemCollectionFacade())
		},
	],
	TabsCollectionDescriptor: [
		'TabsCollectionItemDescriptor',
		() => {
			const facade = new TTabsCollectionFacade({}, { owner: new TTabs() })

			facade.items = SOURCES

			return withItem(facade, new TTabsItemCollectionFacade())
		},
	],
	TagsCollectionDescriptor: [
		'TagsCollectionItemDescriptor',
		() => {
			const facade = new TTagsCollectionFacade({}, { owner: new TTags() })

			facade.items = SOURCES

			return withItem(facade, new TTagsItemCollectionFacade())
		},
	],
}

/** Фасад коллекции или её элемента: у них нет своего инстанса без владельца. */
const isFacade = (descriptor: IComponentDescriptor): boolean =>
	descriptor.ctor.prototype instanceof TCollectionComponent ||
	descriptor.ctor.prototype instanceof TCollectionItemComponent

describe('сторож: повторная запись того же значения молчит', () => {
	// У дескриптора без своего класса (`CollectionDescriptor`) инстанса нет
	const descriptors = exportedDescriptors().filter(([, descriptor]) => descriptor.ctor !== Object)
	const components = descriptors.filter(([, descriptor]) => !isFacade(descriptor))
	const facades = descriptors.filter(
		([, descriptor]) => isFacade(descriptor) && writtenByMarkup(descriptor.props).length > 0,
	)

	it('дескрипторы найдены в экспорте', () => {
		expect(components.map(([name]) => name)).toEqual(
			expect.arrayContaining(['ButtonDescriptor', 'SliderDescriptor', 'FrameDescriptor']),
		)
	})

	it('таблица коллекций покрывает каждый фасад с записываемыми пропсами', () => {
		const covered = Object.entries(COLLECTIONS).flatMap(([owner, [item]]) => [owner, item])

		expect(covered.sort()).toEqual(facades.map(([name]) => name).sort())
	})

	it('сторож видит повтор: сеттер без сверки ловится', () => {
		const spec = required(
			exportedDescriptors()
				.find(([name]) => name === 'ButtonDescriptor')?.[1]
				.props.find((prop) => prop.name.getName() === 'text'),
			'text',
		)
		// Владелец, чей сеттер пишет и шлёт триггер, не сверяясь со своим
		const events = new TEvented<{ 'change:text': () => void }>()
		const owner = {
			events,
			get text() {
				return 'x'
			},
			set text(_value: string) {
				events.emit('change:text')
			},
		}

		expect(rewrite(spec, owner)).toEqual(['text: change:text'])
	})

	it.each(components)('%s', (_name, descriptor) => {
		const instance = new descriptor.ctor()
		const context = createAdapterContext(descriptor, { ctrl: instance })

		const fired = [
			...writtenByMarkup(descriptor.props).flatMap((spec) => rewrite(spec, instance)),
			...descriptor.plugins.flatMap((definition) =>
				writtenByMarkup(definition.props).flatMap((spec) =>
					rewrite(
						spec,
						required(context.bundle?.get(definition.ctor), spec.name.getName()),
					),
				),
			),
		]

		context.destroy()

		expect(fired).toEqual([])
	})

	it.each(facades)('%s', (name, descriptor) => {
		const entry = Object.entries(COLLECTIONS).find(
			([owner, [item]]) => owner === name || item === name,
		)
		const [owner, [, mount]] = required(entry, name)
		const mounted = mount()
		const target = owner === name ? mounted.facade : mounted.itemFacade

		expect(target).toBeInstanceOf(descriptor.ctor)
		expect(writtenByMarkup(descriptor.props).flatMap((spec) => rewrite(spec, target))).toEqual(
			[],
		)
	})
})
