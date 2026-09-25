// @vitest-environment jsdom

/**
 * Сторож: уничтоженный набор снимает с долгоживущих шин всё, что повесили на
 * них его плагины.
 *
 * Шина владельца переживает набор, когда приложение передаёт свой `ctrl`:
 * каждое монтирование ставит ему новый набор. Шины расширений движка
 * переживают его, когда движок пришёл снаружи (`engine`). Подписка, которую
 * `destroy()` не снял, копит на них обработчики уничтоженных плагинов. Вреда
 * не видно — у мёртвого плагина обнулены ссылки, и обработчик ничего не
 * делает, — поэтому стережётся тестом, а не ревью. Подписываются на такие шины
 * методом базы (`TBasePlugin._listenTo`), и отписку он делает сам.
 *
 * Сверка — по шпионам на `on` и `off` шины, как в describe «уничтожение»
 * `plugins/__tests__/modal-focus.plugin.spec.ts`: каждая пара «событие,
 * обработчик», повешенная на шину, после уничтожения найдена среди снятых.
 * Шпионы ставятся до сборки, но после создания владельца и движка, поэтому
 * подписки самого ядра — владельца на свою шину и расширений движка на
 * владельца — в сверку не попадают.
 *
 * Идёт по всем дескрипторам экспорта: новый плагин и новая коллекция попадут
 * под проверку сами.
 */

import { describe, it, expect, vi } from 'vitest'
import {
	TAccordion,
	TEvented,
	TListBox,
	TSelect,
	TTabs,
	TTags,
	createEngineAccordion,
	createEngineListBox,
	createEngineSelect,
	createEngineTabs,
	createEngineTags,
} from '@soldy-ui/core'
import type { TCollectionEngine } from '@soldy-ui/core'
import { TCollectionBundlesPlugin } from '@soldy-ui/plugins'
import { FrameDescriptor, TabsDescriptor } from '../content/descriptors'
import { createAdapterContext } from '../protected/adapter'
import type { IComponentDescriptor } from '../protected/define'
import { exportedDescriptors, required } from './helpers'

/** Шпион, который помнит аргументы вызовов. */
interface ICallLog {
	readonly mock: { readonly calls: ReadonlyArray<readonly unknown[]> }
}

/** Подписки шины: что на неё повесили и что с неё сняли. */
interface IBusSpy {
	readonly name: string
	readonly on: ICallLog
	readonly off: ICallLog
}

/** Шпионы на `on` и `off` шины у того, у кого она есть. Без шины следить не за чем. */
function spyBus(name: string, holder: unknown): IBusSpy[] {
	const bus: unknown =
		typeof holder === 'object' && holder !== null ? Reflect.get(holder, 'events') : null

	if (!(bus instanceof TEvented)) return []

	return [{ name, on: vi.spyOn(bus, 'on'), off: vi.spyOn(bus, 'off') }]
}

/** Подписки, повешенные на шины: `<шина>: <событие>`. */
function subscribed(spies: readonly IBusSpy[]): string[] {
	return spies.flatMap(({ name, on }) =>
		on.mock.calls.map(([event]) => `${name}: ${String(event)}`),
	)
}

/** Подписки, которые остались на шинах после уничтожения: `<шина>: <событие>`. */
function leftovers(spies: readonly IBusSpy[]): string[] {
	return spies.flatMap(({ name, on, off }) =>
		on.mock.calls
			.filter(
				([event, handler]) =>
					!off.mock.calls.some(([e, h]) => e === event && h === handler),
			)
			.map(([event]) => `${name}: ${String(event)}`),
	)
}

/** Собрать компонент над своим `ctrl` и уничтожить. */
function mountOwner(descriptor: IComponentDescriptor): IBusSpy[] {
	const ctrl = new descriptor.ctor()
	const spies = spyBus('владелец', ctrl)

	createAdapterContext(descriptor, { ctrl }).destroy()

	return spies
}

/** Владелец и его движок — так их собирает приложение, передавая `engine` снаружи. */
type TOwnedEngine = { readonly owner: object; readonly engine: TCollectionEngine<any, any> }

/**
 * Движок каждой коллекции, чей набор держит реестр bundles, — фабрикой ядра.
 * Коллекция без строки здесь роняет сторож ниже.
 */
const ENGINES: Readonly<Record<string, () => TOwnedEngine>> = {
	AccordionDescriptor: () => {
		const owner = new TAccordion()

		return { owner, engine: createEngineAccordion({ owner }) }
	},
	ListBoxDescriptor: () => {
		const owner = new TListBox()

		return { owner, engine: createEngineListBox({ owner }) }
	},
	SelectDescriptor: () => {
		const owner = new TSelect()

		return { owner, engine: createEngineSelect({ owner }) }
	},
	TabsDescriptor: () => {
		const owner = new TTabs()

		return { owner, engine: createEngineTabs({ owner }) }
	},
	TagsDescriptor: () => {
		const owner = new TTags()

		return { owner, engine: createEngineTags({ owner }) }
	},
}

/**
 * Собрать коллекцию над своим `ctrl` и движком снаружи, привязать движок, как
 * это делает `TCollectionExtension`, и уничтожить.
 */
function mountEngine(name: string, descriptor: IComponentDescriptor): IBusSpy[] {
	const { owner, engine } = required(ENGINES[name], name)()

	expect(owner).toBeInstanceOf(descriptor.ctor)

	const extensions: Readonly<Record<string, unknown>> = engine.extensions
	const spies = [
		...spyBus('владелец', owner),
		...Object.entries(extensions).flatMap(([key, extension]) => spyBus(key, extension)),
	]
	const context = createAdapterContext(descriptor, { ctrl: owner })

	required(context.bundle?.get(TCollectionBundlesPlugin), 'реестр bundles').bindEngine(engine)
	context.destroy()

	return spies
}

describe('сторож: плагины снимают подписки с шины владельца', () => {
	const descriptors = exportedDescriptors().filter(
		([, descriptor]) => descriptor.plugins.length > 0,
	)

	it('дескрипторы с плагинами найдены в экспорте', () => {
		expect(descriptors.map(([name]) => name)).toEqual(
			expect.arrayContaining(['FrameDescriptor', 'SelectDescriptor', 'TooltipDescriptor']),
		)
	})

	it('шпионы видят подписки плагинов: у Frame — привязка и раскладка', () => {
		expect(subscribed(mountOwner(FrameDescriptor()))).toEqual(
			expect.arrayContaining(['владелец: show', 'владелец: change:x']),
		)
	})

	it.each(descriptors)('%s', (_name, descriptor) => {
		expect(leftovers(mountOwner(descriptor))).toEqual([])
	})
})

describe('сторож: плагины снимают подписки с шин движка', () => {
	const descriptors = exportedDescriptors().filter(([, descriptor]) =>
		descriptor.plugins.some((definition) => definition.ctor === TCollectionBundlesPlugin),
	)

	it('таблица движков покрывает каждую коллекцию с реестром bundles', () => {
		expect(Object.keys(ENGINES).sort()).toEqual(descriptors.map(([name]) => name).sort())
	})

	it('шпионы видят подписки плагинов: у Tabs — активация и состав', () => {
		expect(subscribed(mountEngine('TabsDescriptor', TabsDescriptor()))).toEqual(
			expect.arrayContaining(['activation: item:activated', 'plain: item:removed']),
		)
	})

	it.each(descriptors)('%s', (name, descriptor) => {
		expect(leftovers(mountEngine(name, descriptor))).toEqual([])
	})
})
