// @vitest-environment jsdom

/**
 * Сторож: монтирование коллекции над владельцем и движком снаружи не оставляет
 * на них ничего — ни подписок, ни перехватчиков.
 *
 * Владелец (`ctrl`) и движок (`engine`), переданные снаружи, живут дольше
 * монтирования, и каждое монтирование вешает на них своё: плагины набора —
 * подписки, фасад коллекции — пробросы с расширений движка (`relayAll`, на
 * перехватчиках `use`). Раньше пробросы фасада не снимались ни в одном
 * адаптере: с каждым монтированием на движке прибавлялось по перехватчику на
 * расширение. Теперь проброс держит источник, только пока фасад слушают
 * (`TEvented`), и уходит вместе с обменом адаптера.
 *
 * Монтирование — как у адаптеров: свой контекст над `ctrl`, контекст фасада
 * на его наборе с движком в опциях и расширением коллекции; приём — подписка
 * обмена обоих на состояние и события и `attach`; снятие — отписка и
 * `destroy`. Шпионы ставятся после создания владельца и движка, поэтому
 * подписки самого ядра в сверку не попадают. Монтирований три: утечка растёт с
 * каждым.
 *
 * Идёт по всем фасадам коллекций из экспорта: новая коллекция без строки в
 * таблице роняет сторож.
 */

import { describe, it, expect } from 'vitest'
import {
	TAccordion,
	TCalendar,
	TCollectionComponent,
	TListBox,
	TRadioGroup,
	TSelect,
	TTable,
	TTabs,
	TTags,
	createEngineAccordion,
	createEngineCalendar,
	createEngineListBox,
	createEngineRadioGroup,
	createEngineSelect,
	createEngineTable,
	createEngineTabs,
	createEngineTags,
} from '@soldy-ui/core'
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
	TableCollectionDescriptor,
	TableDescriptor,
	TabsCollectionDescriptor,
	TabsDescriptor,
	TagsCollectionDescriptor,
	TagsDescriptor,
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
	type IBusSpy,
} from './helpers'

/** Сколько раз коллекция монтируется и снимается. */
const MOUNTS = 3

/** Монтирование: принять контексты и вернуть их снятие. */
type TMount = () => () => void

/** Коллекция под сторожем: владелец и движок снаружи и её монтирование над ними. */
type TCollectionKit = () => {
	readonly owner: object
	readonly engine: TCollectionEngine<any, any>
	readonly mount: TMount
}

/**
 * Принять контексты, как это делает рантайм адаптера: обмен подписан на
 * состояние и события, `attach` — по порядку сборки. Снятие — отписка обмена
 * и `destroy`, фасад раньше владельца.
 */
function accept(contexts: readonly IAdapterContext[]): () => void {
	const offs = contexts.flatMap((context) => {
		const exchange = context.connect(CommonProfile)

		return [exchange.state.subscribe(() => {}), exchange.events.listen(() => {})]
	})

	for (const context of contexts) context.attach()

	return () => {
		offs.forEach((off) => off())

		for (const context of [...contexts].reverse()) context.destroy()
	}
}

/**
 * Смонтировать коллекцию так, как её монтируют адаптеры: свой контекст над
 * `ctrl` и контекст фасада на его наборе, с движком снаружи.
 */
function mountOver<TFacade extends TCollectionOwner, TPlugins extends IPluginsContract>(
	own: IComponentDescriptor,
	collection: IComponentDescriptor<TContextContract<TFacade, TPlugins>>,
	ctrl: object,
	engine: TCollectionEngine<any, any>,
): () => void {
	const { factory: elevator } = createElevatorFactory()
	const adapter = createAdapterContext(own, { ctrl })
	const facade = createAdapterContext(
		collection,
		{ props: {}, options: { owner: adapter.instance, engine } },
		{ bundle: adapter.bundle },
	).use(TCollectionExtension, { elevator })

	return accept([adapter, facade])
}

/** Коллекции экспорта — ключ по дескриптору фасада коллекции. */
const COLLECTIONS: Readonly<Record<string, TCollectionKit>> = {
	AccordionCollectionDescriptor: () => {
		const owner = new TAccordion()
		const engine = createEngineAccordion()

		return {
			owner,
			engine,
			mount: () =>
				mountOver(AccordionDescriptor(), AccordionCollectionDescriptor(), owner, engine),
		}
	},
	CalendarCollectionDescriptor: () => {
		const owner = new TCalendar()
		const engine = createEngineCalendar()

		return {
			owner,
			engine,
			mount: () =>
				mountOver(CalendarDescriptor(), CalendarCollectionDescriptor(), owner, engine),
		}
	},
	ListBoxCollectionDescriptor: () => {
		const owner = new TListBox()
		const engine = createEngineListBox()

		return {
			owner,
			engine,
			mount: () =>
				mountOver(ListBoxDescriptor(), ListBoxCollectionDescriptor(), owner, engine),
		}
	},
	RadioGroupCollectionDescriptor: () => {
		const owner = new TRadioGroup()
		const engine = createEngineRadioGroup()

		return {
			owner,
			engine,
			mount: () =>
				mountOver(RadioGroupDescriptor(), RadioGroupCollectionDescriptor(), owner, engine),
		}
	},
	SelectCollectionDescriptor: () => {
		const owner = new TSelect()
		const engine = createEngineSelect()

		return {
			owner,
			engine,
			mount: () => mountOver(SelectDescriptor(), SelectCollectionDescriptor(), owner, engine),
		}
	},
	TableCollectionDescriptor: () => {
		const owner = new TTable()
		const engine = createEngineTable()

		return {
			owner,
			engine,
			mount: () => mountOver(TableDescriptor(), TableCollectionDescriptor(), owner, engine),
		}
	},
	TabsCollectionDescriptor: () => {
		const owner = new TTabs()
		const engine = createEngineTabs()

		return {
			owner,
			engine,
			mount: () => mountOver(TabsDescriptor(), TabsCollectionDescriptor(), owner, engine),
		}
	},
	TagsCollectionDescriptor: () => {
		const owner = new TTags()
		const engine = createEngineTags()

		return {
			owner,
			engine,
			mount: () => mountOver(TagsDescriptor(), TagsCollectionDescriptor(), owner, engine),
		}
	},
}

/** Шины, которые переживают монтирование: владелец, движок, драйвер и каждое расширение. */
function spyOutside(owner: object, engine: TCollectionEngine<any, any>): IBusSpy[] {
	const extensions: Readonly<Record<string, unknown>> = engine.extensions

	return [
		...spyBus('владелец', owner),
		...spyBus('движок', engine),
		...spyBus('driver', engine.getCore().driver),
		...Object.entries(extensions).flatMap(([key, extension]) => spyBus(key, extension)),
	]
}

describe('сторож: коллекция над владельцем и движком снаружи ничего на них не оставляет', () => {
	it('таблица покрывает каждый фасад коллекции из экспорта', () => {
		const facades = exportedDescriptors()
			.filter(([, descriptor]) => descriptor.ctor.prototype instanceof TCollectionComponent)
			.map(([name]) => name)

		expect(Object.keys(COLLECTIONS).sort()).toEqual(facades.sort())
	})

	it('шпионы видят пробросы фасада: пока Tabs смонтирован, на расширениях стоят перехватчики', () => {
		const { owner, engine, mount } = required(COLLECTIONS.TabsCollectionDescriptor, 'Tabs')()
		const spies = spyOutside(owner, engine)
		const unmount = mount()

		expect(leftovers(spies)).toEqual(
			expect.arrayContaining(['plain: use', 'batch: use', 'activation: use', 'tabs: use']),
		)

		unmount()
	})

	it.each(Object.entries(COLLECTIONS))('%s', (_name, kit) => {
		const { owner, engine, mount } = kit()
		const spies = spyOutside(owner, engine)

		for (let i = 0; i < MOUNTS; i++) mount()()

		expect(leftovers(spies)).toEqual([])
	})
})
