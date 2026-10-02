// @vitest-environment jsdom

/**
 * Сторож: сборка оставляет на долгоживущих шинах только то, что снимет
 * сама, — уничтоженная снимает всё, а непринятая не вешает ничего.
 *
 * Шина владельца переживает набор, когда приложение передаёт свой `ctrl`:
 * каждое монтирование ставит ему новый набор. Шины движка переживают его,
 * когда движок пришёл снаружи (`engine`). Подписка, которую `destroy()` не
 * снял, копит на них обработчики уничтоженных плагинов. Вреда не видно — у
 * мёртвого плагина обнулены ссылки, и обработчик ничего не делает, — поэтому
 * стережётся тестом, а не ревью. Подписываются на такие шины методом базы
 * (`TBasePlugin._listenTo`), и отписку он делает сам.
 *
 * Сборку, которую фреймворк не принял (`attach`), уничтожать некому: рендер
 * отбросили до показа, и `destroy()` не будет. Поэтому до принятия набор на
 * чужие шины не подписан вовсе — `_listenTo` откладывает подписку, а набор
 * объявляется (`bundle:create`) только принятым. Фасад коллекции подписан на
 * движок пробросами, а проброс висит на источнике, пока фасад слушают.
 *
 * Сверка — по шпионам на `on`, `off` и `use` шины, как в describe «уничтожение»
 * `plugins/__tests__/modal-focus.plugin.spec.ts`: каждая подписка, повешенная
 * на шину, после уничтожения найдена среди снятых, а у непринятой сборки
 * подписок нет вовсе. Шпионы ставятся до сборки, но после создания владельца и
 * движка, поэтому подписки самого ядра — владельца на свою шину и расширений
 * движка на владельца — в сверку не попадают.
 *
 * Идёт по всем дескрипторам экспорта: новый плагин и новая коллекция попадут
 * под проверку сами.
 */

import { describe, it, expect } from 'vitest'
import {
	TAccordion,
	TCalendar,
	TListBox,
	TRadioGroup,
	TSelect,
	TTabs,
	TTags,
	createEngineAccordion,
	createEngineCalendar,
	createEngineListBox,
	createEngineRadioGroup,
	createEngineSelect,
	createEngineTabs,
	createEngineTags,
} from '@soldy-ui/core'
import type { TCollectionEngine } from '@soldy-ui/core'
import { TCollectionBundlesPlugin } from '@soldy-ui/plugins'
import type { IPluginBundle } from '@soldy-ui/plugins'
import {
	AccordionCollectionDescriptor,
	CalendarCollectionDescriptor,
	FrameDescriptor,
	ListBoxCollectionDescriptor,
	RadioGroupCollectionDescriptor,
	SelectCollectionDescriptor,
	TabsCollectionDescriptor,
	TabsDescriptor,
	TagsCollectionDescriptor,
} from '../content/descriptors'
import { TCollectionExtension } from '../content/extensions'
import type { TCollectionOwner } from '../content/extensions'
import { createAdapterContext } from '../protected/adapter'
import type { IAdapterContext, TContextContract } from '../protected/adapter'
import type { IComponentDescriptor, IPluginsContract } from '../protected/define'
import { CommonProfile } from '../protected/naming'
import {
	createElevatorFactory,
	exportedDescriptors,
	leftovers,
	required,
	spyBus,
	subscribed,
	type IBusSpy,
} from './helpers'

/** Прочитать снимок состояния, как его читает рендер до подписки. */
function render(context: IAdapterContext): void {
	context.connect(CommonProfile).state.getSnapshot()
}

/**
 * Смонтировать собранные контексты, как это делает рантайм адаптера, и
 * снять: подписка на состояние и `attach` по порядку сборки, отписка и
 * `destroy` — в обратном.
 */
function mountAndUnmount(contexts: readonly IAdapterContext[]): void {
	const offs = contexts.map((context) => context.connect(CommonProfile).state.subscribe(() => {}))

	for (const context of contexts) context.attach()

	offs.forEach((off) => off())

	for (const context of [...contexts].reverse()) context.destroy()
}

/** Владелец своего `ctrl` и шпионы на его шине — до сборки. */
function spyOwner(descriptor: IComponentDescriptor): { ctrl: object; spies: IBusSpy[] } {
	const ctrl = new descriptor.ctor()

	return { ctrl, spies: spyBus('владелец', ctrl) }
}

/** Собрать компонент над своим `ctrl`, смонтировать и уничтожить. */
function mountOwner(descriptor: IComponentDescriptor): IBusSpy[] {
	const { ctrl, spies } = spyOwner(descriptor)

	mountAndUnmount([createAdapterContext(descriptor, { ctrl })])

	return spies
}

/** Собрать компонент над своим `ctrl` и прочитать — без приёма и уничтожения. */
function renderOwner(descriptor: IComponentDescriptor): IBusSpy[] {
	const { ctrl, spies } = spyOwner(descriptor)

	render(createAdapterContext(descriptor, { ctrl }))

	return spies
}

/** Владелец и его движок — так их собирает приложение, передавая `engine` снаружи. */
type TOwnedEngine = { readonly owner: object; readonly engine: TCollectionEngine<any, any> }

/** Коллекция с движком снаружи: как его создают и какой фасад над ним собирает адаптер. */
type TEngineKit = {
	readonly create: () => TOwnedEngine
	readonly facade: (owned: TOwnedEngine, bundle: IPluginBundle | null) => IAdapterContext
}

/**
 * Фасад коллекции над движком снаружи на наборе владельца — как его собирают
 * адаптеры: опции `owner` и `engine`, расширение коллекции. Оно и привязывает
 * движок к реестру bundles набора.
 */
function assembleFacade<TFacade extends TCollectionOwner, TPlugins extends IPluginsContract>(
	collection: IComponentDescriptor<TContextContract<TFacade, TPlugins>>,
	{ owner, engine }: TOwnedEngine,
	bundle: IPluginBundle | null,
): IAdapterContext {
	return createAdapterContext(collection, { options: { owner, engine } }, { bundle }).use(
		TCollectionExtension,
		{ elevator: createElevatorFactory().factory },
	)
}

/**
 * Движок каждой коллекции, чей набор держит реестр bundles, — фабрикой ядра, и
 * фасад над ним. Коллекция без строки здесь роняет сторож ниже.
 */
const ENGINES: Readonly<Record<string, TEngineKit>> = {
	AccordionDescriptor: {
		create: () => {
			const owner = new TAccordion()

			return { owner, engine: createEngineAccordion({ owner }) }
		},
		facade: (owned, bundle) => assembleFacade(AccordionCollectionDescriptor(), owned, bundle),
	},
	CalendarDescriptor: {
		create: () => {
			const owner = new TCalendar()

			return { owner, engine: createEngineCalendar({ owner }) }
		},
		facade: (owned, bundle) => assembleFacade(CalendarCollectionDescriptor(), owned, bundle),
	},
	ListBoxDescriptor: {
		create: () => {
			const owner = new TListBox()

			return { owner, engine: createEngineListBox({ owner }) }
		},
		facade: (owned, bundle) => assembleFacade(ListBoxCollectionDescriptor(), owned, bundle),
	},
	RadioGroupDescriptor: {
		create: () => {
			const owner = new TRadioGroup()

			return { owner, engine: createEngineRadioGroup({ owner }) }
		},
		facade: (owned, bundle) => assembleFacade(RadioGroupCollectionDescriptor(), owned, bundle),
	},
	SelectDescriptor: {
		create: () => {
			const owner = new TSelect()

			return { owner, engine: createEngineSelect({ owner }) }
		},
		facade: (owned, bundle) => assembleFacade(SelectCollectionDescriptor(), owned, bundle),
	},
	TabsDescriptor: {
		create: () => {
			const owner = new TTabs()

			return { owner, engine: createEngineTabs({ owner }) }
		},
		facade: (owned, bundle) => assembleFacade(TabsCollectionDescriptor(), owned, bundle),
	},
	TagsDescriptor: {
		create: () => {
			const owner = new TTags()

			return { owner, engine: createEngineTags({ owner }) }
		},
		facade: (owned, bundle) => assembleFacade(TagsCollectionDescriptor(), owned, bundle),
	},
}

/** Владелец и движок снаружи, шпионы на их шинах — до сборки. */
function spyEngine(name: string): { owned: TOwnedEngine; kit: TEngineKit; spies: IBusSpy[] } {
	const kit = required(ENGINES[name], name)
	const owned = kit.create()
	const extensions: Readonly<Record<string, unknown>> = owned.engine.extensions

	return {
		owned,
		kit,
		spies: [
			...spyBus('владелец', owned.owner),
			...spyBus('engine', owned.engine),
			...Object.entries(extensions).flatMap(([key, extension]) => spyBus(key, extension)),
		],
	}
}

/** Собрать владельца и фасад коллекции над движком снаружи. */
function assembleCollection(
	descriptor: IComponentDescriptor,
	owned: TOwnedEngine,
	kit: TEngineKit,
): IAdapterContext[] {
	expect(owned.owner).toBeInstanceOf(descriptor.ctor)

	const context = createAdapterContext(descriptor, { ctrl: owned.owner })

	return [context, kit.facade(owned, context.bundle)]
}

/** Собрать коллекцию над своим `ctrl` и движком снаружи, смонтировать и уничтожить. */
function mountEngine(name: string, descriptor: IComponentDescriptor): IBusSpy[] {
	const { owned, kit, spies } = spyEngine(name)

	mountAndUnmount(assembleCollection(descriptor, owned, kit))

	return spies
}

/** Собрать коллекцию над своим `ctrl` и движком снаружи и прочитать — без приёма. */
function renderEngine(name: string, descriptor: IComponentDescriptor): IBusSpy[] {
	const { owned, kit, spies } = spyEngine(name)

	assembleCollection(descriptor, owned, kit).forEach(render)

	return spies
}

const withPlugins = exportedDescriptors().filter(([, descriptor]) => descriptor.plugins.length > 0)

const withEngines = exportedDescriptors().filter(([, descriptor]) =>
	descriptor.plugins.some((definition) => definition.ctor === TCollectionBundlesPlugin),
)

describe('сторож: плагины снимают подписки с шины владельца', () => {
	it('дескрипторы с плагинами найдены в экспорте', () => {
		expect(withPlugins.map(([name]) => name)).toEqual(
			expect.arrayContaining(['FrameDescriptor', 'SelectDescriptor', 'TooltipDescriptor']),
		)
	})

	it('шпионы видят подписки плагинов: у Frame — привязка и раскладка', () => {
		expect(subscribed(mountOwner(FrameDescriptor()))).toEqual(
			expect.arrayContaining(['владелец: show', 'владелец: change:x']),
		)
	})

	it.each(withPlugins)('%s', (_name, descriptor) => {
		expect(leftovers(mountOwner(descriptor))).toEqual([])
	})
})

describe('сторож: сборка снимает подписки с шин движка', () => {
	it('таблица движков покрывает каждую коллекцию с реестром bundles', () => {
		expect(Object.keys(ENGINES).sort()).toEqual(withEngines.map(([name]) => name).sort())
	})

	it('шпионы видят подписки плагинов и пробросы фасада: у Tabs — активация и состав', () => {
		expect(subscribed(mountEngine('TabsDescriptor', TabsDescriptor()))).toEqual(
			expect.arrayContaining([
				'activation: item:activated',
				'plain: item:removed',
				'plain: use',
				'activation: use',
			]),
		)
	})

	it.each(withEngines)('%s', (name, descriptor) => {
		expect(leftovers(mountEngine(name, descriptor))).toEqual([])
	})
})

/**
 * Сборка, которую не приняли и не уничтожили, — рендер, отброшенный до показа:
 * снимок прочитан, а ни `attach`, ни `destroy` не будет. На чужих шинах она не
 * оставляет ничего — ни обработчиков, ни перехватчиков.
 */
describe('сторож: непринятая сборка не подписана на чужие шины', () => {
	it.each(withPlugins)('владелец: %s', (_name, descriptor) => {
		expect(subscribed(renderOwner(descriptor))).toEqual([])
	})

	it.each(withEngines)('движок: %s', (name, descriptor) => {
		expect(subscribed(renderEngine(name, descriptor))).toEqual([])
	})
})
