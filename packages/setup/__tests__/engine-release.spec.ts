// @vitest-environment jsdom

/**
 * Сторож: уходящий список снимает с долгоживущих шин всё, что повесили на них
 * расширения его владельца и сам фасад.
 *
 * Владельческие расширения движка (`value`, `list`, `tabs` и соседи) живут,
 * пока владелец держит движок: фасад, уходя, отпускает его (`releaseEngine`).
 * Шины вокруг живут дольше. Движок, пришедший снаружи (`engine`), переживает
 * монтирование вместе с драйвером, соседними расширениями и элементами из
 * данных: React пересобирает список под StrictMode и `<Activity>`, Vue
 * монтирует заново под `v-if`. Свой `ctrl` приложения переживает
 * монтирование со своей шиной — и когда движок фасад собрал сам. Подписка,
 * которую уход не снял, оставляет на такой шине обработчик мёртвого
 * расширения, и тот продолжает писать элементам свойства ушедшего владельца.
 * Перехватчик, которым фасад пробрасывает события расширения (`relayAll`),
 * оставляет мёртвому фасаду каждое событие живого движка. Снаружи ни того ни
 * другого не видно, поэтому стережётся тестом. Владельческие расширения
 * подписываются через `TBaseExtension._listenTo`, и отписку делает их
 * `destroy`; перехватчики фасада снимает его `destroy`.
 *
 * Сверка — шпионами на шины, как в `plugin-unsubscribe.spec.ts`: каждая пара
 * «событие, обработчик», повешенная на шину (`on`), после ухода найдена среди
 * снятых (`off`), а каждый перехватчик (`use`) снят. Список монтируется так,
 * как его монтируют адаптеры: свой контекст над своим `ctrl`, контекст фасада
 * на его наборе с `TCollectionExtension`; уход — `destroy` обоих, фасад
 * первым, как у React.
 *
 * - Движок снаружи: до слежки через него уже прошёл один владелец — движок
 *   дособран (фабрика, выбор или активация), элементы из данных стали
 *   экземплярами. Шпионы — на драйвере, каждом расширении и каждом элементе
 *   движка и на шине нового владельца.
 * - Свой движок: его шин до монтирования нет, шпион — на шине владельца.
 *
 * Идёт по всем фасадам коллекций из экспорта: новая коллекция попадёт под
 * проверку сама — без строки в таблице сторож упадёт.
 */

import { describe, it, expect, vi } from 'vitest'
import { TCollectionComponent, TEvented, createEngine } from '@soldy-ui/core'
import type { TCollectionEngine } from '@soldy-ui/core'
import {
	AccordionCollectionDescriptor,
	AccordionDescriptor,
	ListBoxCollectionDescriptor,
	ListBoxDescriptor,
	RadioGroupCollectionDescriptor,
	RadioGroupDescriptor,
	SelectCollectionDescriptor,
	SelectDescriptor,
	TabsCollectionDescriptor,
	TabsDescriptor,
	TagsCollectionDescriptor,
	TagsDescriptor,
} from '../content/descriptors'
import { TCollectionExtension } from '../content/extensions'
import type { TCollectionOwner } from '../content/extensions'
import { createAdapterContext } from '../protected/adapter'
import type { TContextContract } from '../protected/adapter'
import type { IComponentDescriptor, IPluginsContract } from '../protected/define'
import {
	createElevatorFactory,
	exportedDescriptors,
	leftovers,
	required,
	spyBus,
	subscribed,
	type IBusSpy,
} from './helpers'

/** Состав из данных: у элемента из данных `value` и `text` есть в любой коллекции. */
const SOURCES = [
	{ value: 'a', text: 'A' },
	{ value: 'b', text: 'B' },
]

/**
 * Смонтировать список над своим `ctrl` и уйти. Движок снаружи — фасад его
 * дособирает; без него фасад собирает свой из `items`. Отдаёт движок, на
 * котором работал список.
 */
function mountList<TFacade extends TCollectionOwner, TPlugins extends IPluginsContract>(
	own: IComponentDescriptor,
	collection: IComponentDescriptor<TContextContract<TFacade, TPlugins>>,
	ctrl: object,
	engine?: TCollectionEngine<any, any>,
): TCollectionEngine<any, any> {
	const { factory: elevator } = createElevatorFactory()
	const owner = createAdapterContext(own, { ctrl })
	const facade = createAdapterContext(
		collection,
		{
			props: engine ? {} : { items: SOURCES.map((source) => ({ ...source })) },
			options: { owner: owner.instance, engine },
		},
		{ bundle: owner.bundle },
	).use(TCollectionExtension, { elevator })

	owner.attach()
	facade.attach()

	facade.destroy()
	owner.destroy()

	return facade.instance.engine
}

/** Коллекция под сторожем: дескриптор компонента — его класс и есть владелец. */
type TCollectionKit = {
	readonly own: () => IComponentDescriptor
	readonly mount: (
		ctrl: object,
		engine?: TCollectionEngine<any, any>,
	) => TCollectionEngine<any, any>
}

/** Коллекции экспорта — ключ по дескриптору фасада. */
const COLLECTIONS: Readonly<Record<string, TCollectionKit>> = {
	AccordionCollectionDescriptor: {
		own: AccordionDescriptor,
		mount: (ctrl, engine) =>
			mountList(AccordionDescriptor(), AccordionCollectionDescriptor(), ctrl, engine),
	},
	ListBoxCollectionDescriptor: {
		own: ListBoxDescriptor,
		mount: (ctrl, engine) =>
			mountList(ListBoxDescriptor(), ListBoxCollectionDescriptor(), ctrl, engine),
	},
	RadioGroupCollectionDescriptor: {
		own: RadioGroupDescriptor,
		mount: (ctrl, engine) =>
			mountList(RadioGroupDescriptor(), RadioGroupCollectionDescriptor(), ctrl, engine),
	},
	SelectCollectionDescriptor: {
		own: SelectDescriptor,
		mount: (ctrl, engine) =>
			mountList(SelectDescriptor(), SelectCollectionDescriptor(), ctrl, engine),
	},
	TabsCollectionDescriptor: {
		own: TabsDescriptor,
		mount: (ctrl, engine) =>
			mountList(TabsDescriptor(), TabsCollectionDescriptor(), ctrl, engine),
	},
	TagsCollectionDescriptor: {
		own: TagsDescriptor,
		mount: (ctrl, engine) =>
			mountList(TagsDescriptor(), TagsCollectionDescriptor(), ctrl, engine),
	},
}

/** Перехватчики шины: поставленные (`use`) и снятые их отпиской. */
type TMiddlewareSpy = {
	readonly name: string
	readonly added: unknown[]
	readonly removed: Set<unknown>
}

/** Следить за перехватчиками шины у того, у кого она есть. */
function spyMiddlewares(name: string, holder: unknown): TMiddlewareSpy[] {
	const bus: unknown =
		typeof holder === 'object' && holder !== null ? Reflect.get(holder, 'events') : null

	if (!(bus instanceof TEvented)) return []

	const spy: TMiddlewareSpy = { name, added: [], removed: new Set() }
	const use = bus.use.bind(bus)

	vi.spyOn(bus, 'use').mockImplementation((middleware) => {
		const off = use(middleware)

		spy.added.push(middleware)

		return () => {
			spy.removed.add(middleware)
			off()
		}
	})

	return [spy]
}

/** Перехватчики, оставшиеся на шинах после ухода: имя шины на каждый. */
function middlewareLeftovers(spies: readonly TMiddlewareSpy[]): string[] {
	return spies.flatMap(({ name, added, removed }) =>
		added.filter((middleware) => !removed.has(middleware)).map(() => name),
	)
}

/** Шины готового движка и нового владельца: драйвер, расширения, элементы, владелец. */
function spyAround(engine: TCollectionEngine<any, any>, ctrl: object) {
	const extensions: Readonly<Record<string, unknown>> = engine.extensions
	const items: readonly unknown[] = engine.extensions.batch.items
	const holders: Array<[string, unknown]> = [
		['driver', engine.getCore().driver],
		['engine', engine],
		...Object.entries(extensions),
		...items.map((item): [string, unknown] => ['элемент', item]),
		['владелец', ctrl],
	]

	return {
		buses: holders.flatMap(([name, holder]): IBusSpy[] => spyBus(name, holder)),
		middlewares: holders.flatMap(([name, holder]) => spyMiddlewares(name, holder)),
	}
}

/** Готовый движок, через который уже прошёл один владелец коллекции. */
function readyEngine(kit: TCollectionKit): TCollectionEngine<any, any> {
	const engine = createEngine({ items: SOURCES.map((source) => ({ ...source })) })

	kit.mount(new (kit.own().ctor)(), engine)

	return engine
}

describe('сторож: уходящий список снимает подписки своего владельца и фасада', () => {
	it('таблица покрывает каждый фасад коллекции из экспорта', () => {
		const facades = exportedDescriptors()
			.filter(([, descriptor]) => descriptor.ctor.prototype instanceof TCollectionComponent)
			.map(([name]) => name)

		expect(Object.keys(COLLECTIONS).sort()).toEqual(facades.sort())
	})

	it('шпионы видят подписки: у ListBox — драйвер, выбор, владелец, элемент и перехватчики', () => {
		const kit = required(COLLECTIONS.ListBoxCollectionDescriptor, 'ListBox')
		const engine = readyEngine(kit)
		const ctrl = new (kit.own().ctor)()
		const { buses, middlewares } = spyAround(engine, ctrl)

		kit.mount(ctrl, engine)

		expect(subscribed(buses)).toEqual(
			expect.arrayContaining([
				'driver: item:added',
				'selection: change:selection',
				'владелец: change:disabled',
				'элемент: change:contentFit',
			]),
		)
		expect(middlewares.filter(({ added }) => added.length > 0).map(({ name }) => name)).toEqual(
			expect.arrayContaining(['selection', 'batch', 'plain', 'engine']),
		)
	})

	describe.each(Object.entries(COLLECTIONS))('%s', (_name, kit) => {
		it('движок снаружи: после ухода ни подписок, ни перехватчиков на движке, владельце и элементах', () => {
			const engine = readyEngine(kit)
			const ctrl = new (kit.own().ctor)()
			const { buses, middlewares } = spyAround(engine, ctrl)

			kit.mount(ctrl, engine)

			expect(leftovers(buses)).toEqual([])
			expect(middlewareLeftovers(middlewares)).toEqual([])
		})

		it('свой движок: после ухода подписок на шине владельца нет', () => {
			const ctrl = new (kit.own().ctor)()
			const spies = spyBus('владелец', ctrl)

			kit.mount(ctrl)

			expect(subscribed(spies)).not.toEqual([])
			expect(leftovers(spies)).toEqual([])
		})
	})
})
