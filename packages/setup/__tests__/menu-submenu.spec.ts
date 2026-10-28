/**
 * Пункт с подменю — первая часть, которая сразу элемент коллекции и владелец
 * своей коллекции того же типа: пункт меню над ним и меню своих пунктов.
 *
 * Сборка — так, как её делают адаптеры: у пункта три контекста на одном
 * наборе — свой, фасад пункта (вход в меню над ним) и фасад меню (свои
 * пункты). Лифт отдаёт ближайшую коллекцию (`collections.md`, «Элемент входит
 * только в ближайшую коллекцию своего типа»): `up()` у пункта — коллекция
 * меню над ним, `down()` — его собственная, и его пункты берут её. Лифт здесь
 * — дерево, как у фреймворков: `up()` читает слой родителя, `down()` пишет в
 * свой, поэтому порядок, в котором пункт берёт и отдаёт коллекцию, не важен.
 * Во Vue то же на настоящем `provide`/`inject` — `ui/vue/__tests__/menu.spec.ts`.
 */

import { describe, it, expect } from 'vitest'
import { TMenu, TMenuItem, TMenuSubmenu, createEngineMenu } from '@soldy-ui/core'
import type {
	IMenuItem,
	IMenuItemSource,
	IMenuSubmenu,
	TCollectionEngine,
	TMenuCollection,
	TMenuSubmenuEntry,
} from '@soldy-ui/core'
import {
	MenuCollectionDescriptor,
	MenuCollectionItemDescriptor,
	MenuDescriptor,
	MenuItemDescriptor,
	MenuSubmenuCollectionDescriptor,
	MenuSubmenuDescriptor,
} from '../content/descriptors'
import { TCollectionExtension, TCollectionItemExtension } from '../content/extensions'
import { createAdapterContext } from '../protected/adapter'
import type { IAdapterContext } from '../protected/adapter'
import { CommonProfile } from '../protected/naming'
import { childOf, elevatorOf, type TElevatorLayer } from './helpers'

/**
 * Принять контексты, как рантайм адаптера: подписка на состояние и `attach`.
 * Отдаёт снятие: отписку и `destroy` в обратном порядке.
 */
function accept(contexts: readonly IAdapterContext[]): () => void {
	const offs = contexts.map((context) => context.connect(CommonProfile).state.subscribe(() => {}))

	for (const context of contexts) context.attach()

	return () => {
		offs.forEach((off) => off())

		for (const context of [...contexts].reverse()) context.destroy()
	}
}

/** Меню — свой контекст и фасад меню на его наборе; движок — снаружи или свой. */
function mountMenu(
	layer: TElevatorLayer,
	engine?: TMenuCollection,
): {
	menu: TMenu
	engine: TCollectionEngine<IMenuItem, any>
} {
	const menu = new TMenu({ open: true })
	const own = createAdapterContext(MenuDescriptor(), { ctrl: menu })
	const facade = createAdapterContext(
		MenuCollectionDescriptor(),
		{ options: { owner: own.instance, engine } },
		{ bundle: own.bundle },
	).use(TCollectionExtension, { elevator: elevatorOf(layer) })

	accept([own, facade])

	return { menu, engine: facade.instance.engine }
}

/**
 * Пункт с подменю — три контекста на одном наборе, как у Vue: фасад пункта
 * берёт коллекцию меню над ним, фасад меню отдаёт свою. Подменю из данных
 * разметка меню кладёт по записи `submenus`: пункт и движок его пунктов дали
 * данные.
 */
function mountSubmenu(
	layer: TElevatorLayer,
	props: object,
	entry?: TMenuSubmenuEntry,
): { submenu: IMenuSubmenu; engine: TCollectionEngine<IMenuItem, any> } {
	const submenu = entry?.ctrl ?? new TMenuSubmenu(props)
	const own = createAdapterContext(MenuSubmenuDescriptor(), { ctrl: submenu, props })
	const elevator = elevatorOf(layer)
	const item = createAdapterContext(
		MenuCollectionItemDescriptor(),
		{ props },
		{ bundle: own.bundle },
	).use(TCollectionItemExtension, { adapter: own, elevator })
	const facade = createAdapterContext(
		MenuSubmenuCollectionDescriptor(),
		{ options: { owner: own.instance, engine: entry?.engine } },
		{ bundle: own.bundle },
	).use(TCollectionExtension, { elevator })

	accept([item, own, facade])

	return { submenu, engine: facade.instance.engine }
}

/** Пункт-действие разметкой и его снятие. */
function mountItem(layer: TElevatorLayer, props: object): { item: TMenuItem; unmount: () => void } {
	const own = createAdapterContext(MenuItemDescriptor(), { props })
	const item = createAdapterContext(
		MenuCollectionItemDescriptor(),
		{ props },
		{ bundle: own.bundle },
	).use(TCollectionItemExtension, { adapter: own, elevator: elevatorOf(layer) })

	return { item: own.instance, unmount: accept([item, own]) }
}

/** Меню «Изменить · Поделиться → (Ссылка, Почта)» разметкой. */
function tree() {
	const menuLayer = childOf()
	const root = mountMenu(menuLayer)
	const editLayer = childOf(menuLayer)
	const edit = mountItem(editLayer, { value: 'edit', text: 'Изменить' }).item
	const shareLayer = childOf(menuLayer)
	const share = mountSubmenu(shareLayer, { value: 'share', text: 'Поделиться' })
	const link = mountItem(childOf(shareLayer), { value: 'link', text: 'Ссылка' }).item
	const mail = mountItem(childOf(shareLayer), { value: 'mail', text: 'Почта' }).item

	return { root, edit, share, link, mail }
}

describe('пункт с подменю — элемент меню над ним и владелец своих пунктов', () => {
	it('пункт входит в коллекцию меню над ним, его пункты — в его собственную', () => {
		const { root, edit, share, link, mail } = tree()

		expect(root.engine.extensions.batch.items).toEqual([edit, share.submenu])
		expect(share.engine).not.toBe(root.engine)
		expect(share.engine.extensions.batch.items).toEqual([link, mail])
		expect(share.engine.options.get('owner')).toBe(share.submenu)
	})

	it('коллекция меню над ним пишет ему то же, что любому пункту, а он — своим', () => {
		const { root, share, link } = tree()

		expect(share.submenu.aria.get('tabindex')).toBe('-1')

		root.menu.size = 'lg'

		expect(share.submenu.size).toBe('lg')
		expect(link.size).toBe('lg')
	})

	it('выбор пункта подменю закрывает меню целиком и доходит до него', () => {
		const { root, share, link } = tree()
		const chosen: unknown[] = []

		root.engine.extensions.menu.events.on('choose', (item: IMenuItem) =>
			chosen.push(item.value),
		)
		share.submenu.open = true
		share.engine.extensions.menu.chooseItem(link)

		expect([root.menu.open, share.submenu.open]).toEqual([false, false])
		expect(chosen).toEqual(['link'])
	})

	it('вложенное подменю — пункт подменю и владелец своих пунктов', () => {
		const shareLayer = childOf(childOf())
		const share = mountSubmenu(shareLayer, { value: 'share' })
		const sendLayer = childOf(shareLayer)
		const send = mountSubmenu(sendLayer, { value: 'send' })
		const fax = mountItem(childOf(sendLayer), { value: 'fax' }).item

		expect(share.engine.extensions.batch.items).toEqual([send.submenu])
		expect(send.engine.extensions.batch.items).toEqual([fax])
	})
})

/**
 * Подменю из данных с пустым `items` и пунктами разметкой — шаблоном
 * `item-content`, который меню выводит в его панели. Вложенный состав такого
 * подменю из данных — `[]`, и патч меню по `trackBy` пишет его в движок
 * подменю сверкой. Пункт разметки держит регистратор подменю, пока тот в
 * разметке: сверка его не снимает, снятие разметки — убирает.
 */
describe('подменю из данных — пункты разметкой', () => {
	it('патч меню по trackBy оставляет пункт разметки в коллекции подменю, снятие разметки — убирает', () => {
		const engine = createEngineMenu()
		const { batch, submenus } = engine.extensions
		const menuLayer = childOf()
		const before: IMenuItemSource[] = [{ value: 'export', text: 'Экспорт', items: [] }]
		const after: IMenuItemSource[] = [{ value: 'export', text: 'Выгрузка', items: [] }]

		batch.trackBy = (item) => item.value
		batch.items = before

		mountMenu(menuLayer, engine)

		const exported = submenus.entries.get(batch.items[0])

		if (!exported) throw new Error('подменю «export» нет')

		// Разметка меню кладёт подменю из данных по его записи
		const exportLayer = childOf(menuLayer)

		mountSubmenu(exportLayer, {}, exported)

		const pdf = mountItem(childOf(exportLayer), { value: 'pdf', text: 'PDF' })

		expect(exported.engine.extensions.batch.items).toEqual([pdf.item])

		batch.items = after

		// Тот же пункт и та же запись: патч правит подменю на месте
		expect(submenus.entries.get(exported.ctrl)).toBe(exported)
		expect(exported.ctrl.text).toBe('Выгрузка')
		expect(exported.engine.extensions.batch.items).toEqual([pdf.item])

		pdf.unmount()

		expect(exported.engine.extensions.batch.items).toEqual([])
	})
})
