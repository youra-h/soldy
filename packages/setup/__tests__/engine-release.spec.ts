// @vitest-environment jsdom

/**
 * Сторож: движок, перешедший к следующему владельцу, не держит ничего от
 * прежнего.
 *
 * Владельческие расширения движка (`value`, `list`, `tabs` и соседи)
 * стоят, пока движок у владельца. Конец монтирования движок только отпускает
 * (`release` фасада): React собирает заново список, живой под StrictMode и
 * `<Activity>`, на том же фасаде. Снимает расширения прежнего владельца и его
 * фасад следующий владелец, взяв отпущенный движок (`attachEngine`). Шины
 * вокруг живут дольше: драйвер, соседние расширения и элементы из данных — с
 * движком, пришедшим снаружи (`engine`), шина владельца — со своим `ctrl`
 * приложения. Подписка, которую переход не снял, оставляет на такой шине
 * обработчик снятого расширения, и тот продолжает писать элементам свойства
 * прежнего владельца. Перехватчик, которым фасад пробрасывает события
 * расширения (`relayAll`), оставляет снятому фасаду каждое событие живого
 * движка. Снаружи ни того ни другого не видно, поэтому стережётся тестом.
 * Владельческие расширения подписываются через `TBaseExtension._listenTo`, и
 * отписку делает их `destroy`; перехватчики фасада снимает его `destroy`.
 *
 * Сверка — шпионами на шины, как в `plugin-unsubscribe.spec.ts`: каждая пара
 * «событие, обработчик», повешенная на шину (`on`) к концу монтирования
 * списка, после перехода найдена среди снятых (`off`), а каждый перехватчик
 * (`use`) снят. Список монтируется так, как его монтируют адаптеры: свой
 * контекст над своим `ctrl`, контекст фасада на его наборе с
 * `TCollectionExtension`, приём обоих; конец монтирования — `destroy` обоих,
 * фасад первым, как у React. До слежки через движок уже прошёл один владелец —
 * движок дособран (фабрика, выбор или активация), элементы из данных стали
 * экземплярами. Шпионы — на драйвере, каждом расширении и каждом элементе
 * движка и на шине владельца под слежкой.
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
	CalendarCollectionDescriptor,
	CalendarDescriptor,
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

/** Смонтировать список над своим `ctrl` и готовым движком и закончить монтирование. */
function mountList<TFacade extends TCollectionOwner, TPlugins extends IPluginsContract>(
	own: IComponentDescriptor,
	collection: IComponentDescriptor<TContextContract<TFacade, TPlugins>>,
	ctrl: object,
	engine: TCollectionEngine<any, any>,
): void {
	const { factory: elevator } = createElevatorFactory()
	const owner = createAdapterContext(own, { ctrl })
	const facade = createAdapterContext(
		collection,
		{ options: { owner: owner.instance, engine } },
		{ bundle: owner.bundle },
	).use(TCollectionExtension, { elevator })

	owner.attach()
	facade.attach()

	facade.destroy()
	owner.destroy()
}

/** Коллекция под сторожем: дескриптор компонента — его класс и есть владелец. */
type TCollectionKit = {
	readonly own: () => IComponentDescriptor
	readonly mount: (ctrl: object, engine: TCollectionEngine<any, any>) => void
}

/** Коллекции экспорта — ключ по дескриптору фасада. */
const COLLECTIONS: Readonly<Record<string, TCollectionKit>> = {
	AccordionCollectionDescriptor: {
		own: AccordionDescriptor,
		mount: (ctrl, engine) =>
			mountList(AccordionDescriptor(), AccordionCollectionDescriptor(), ctrl, engine),
	},
	CalendarCollectionDescriptor: {
		own: CalendarDescriptor,
		mount: (ctrl, engine) =>
			mountList(CalendarDescriptor(), CalendarCollectionDescriptor(), ctrl, engine),
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

/** Подписка, повешенная на шину: шпион шины, событие и обработчик. */
type THung = { readonly spy: IBusSpy; readonly event: unknown; readonly handler: unknown }

/** Перехватчик, повешенный на шину: имя шины и снятые перехватчики её шпиона. */
type THook = { readonly name: string; readonly middleware: unknown; readonly removed: Set<unknown> }

/** Подписки и перехватчики, повешенные к этому моменту. */
function hungNow(
	buses: readonly IBusSpy[],
	middlewares: readonly TMiddlewareSpy[],
): { subscriptions: THung[]; hooks: THook[] } {
	return {
		subscriptions: buses.flatMap((spy): THung[] =>
			spy.on.mock.calls.map(([event, handler]) => ({ spy, event, handler })),
		),
		hooks: middlewares.flatMap(({ name, added, removed }): THook[] =>
			added.map((middleware) => ({ name, middleware, removed })),
		),
	}
}

/** Что из повешенного осталось на шинах: `<шина>: <событие>` и перехватчики. */
function stillHung(hung: { subscriptions: THung[]; hooks: THook[] }): string[] {
	return [
		...hung.subscriptions
			.filter(
				({ spy, event, handler }) =>
					!spy.off.mock.calls.some(([e, h]) => e === event && h === handler),
			)
			.map(({ spy, event }) => `${spy.name}: ${String(event)}`),
		...hung.hooks
			.filter(({ middleware, removed }) => !removed.has(middleware))
			.map(({ name }) => `${name}: перехватчик`),
	]
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

describe('сторож: следующий владелец снимает подписки прежнего владельца и его фасада', () => {
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
		it('на движке, прежнем владельце и элементах ни подписок, ни перехватчиков', () => {
			const engine = readyEngine(kit)
			const ctrl = new (kit.own().ctor)()
			const { buses, middlewares } = spyAround(engine, ctrl)

			kit.mount(ctrl, engine)

			const hung = hungNow(buses, middlewares)

			expect(hung.subscriptions).not.toEqual([])

			kit.mount(new (kit.own().ctor)(), engine)

			expect(stillHung(hung)).toEqual([])
		})
	})
})
