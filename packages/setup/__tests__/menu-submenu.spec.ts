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
import { TMenu, TMenuItem, TMenuSubmenu } from '@soldy-ui/core'
import type { IMenuItem, TCollectionEngine } from '@soldy-ui/core'
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

/** Принять контексты, как рантайм адаптера: подписка на состояние и `attach`. */
function accept(contexts: readonly IAdapterContext[]): void {
	for (const context of contexts) context.connect(CommonProfile).state.subscribe(() => {})
	for (const context of contexts) context.attach()
}

/** Меню — свой контекст и фасад меню на его наборе. */
function mountMenu(layer: TElevatorLayer): {
	menu: TMenu
	engine: TCollectionEngine<IMenuItem, any>
} {
	const menu = new TMenu({ open: true })
	const own = createAdapterContext(MenuDescriptor(), { ctrl: menu })
	const facade = createAdapterContext(
		MenuCollectionDescriptor(),
		{ options: { owner: own.instance } },
		{ bundle: own.bundle },
	).use(TCollectionExtension, { elevator: elevatorOf(layer) })

	accept([own, facade])

	return { menu, engine: facade.instance.engine }
}

/**
 * Пункт с подменю — три контекста на одном наборе, как у Vue: фасад пункта
 * берёт коллекцию меню над ним, фасад меню отдаёт свою.
 */
function mountSubmenu(
	layer: TElevatorLayer,
	props: object,
): { submenu: TMenuSubmenu; engine: TCollectionEngine<IMenuItem, any> } {
	const submenu = new TMenuSubmenu(props)
	const own = createAdapterContext(MenuSubmenuDescriptor(), { ctrl: submenu, props })
	const elevator = elevatorOf(layer)
	const item = createAdapterContext(
		MenuCollectionItemDescriptor(),
		{ props },
		{ bundle: own.bundle },
	).use(TCollectionItemExtension, { item: own.instance, elevator })
	const facade = createAdapterContext(
		MenuSubmenuCollectionDescriptor(),
		{ options: { owner: own.instance } },
		{ bundle: own.bundle },
	).use(TCollectionExtension, { elevator })

	accept([item, own, facade])

	return { submenu, engine: facade.instance.engine }
}

/** Пункт-действие разметкой. */
function mountItem(layer: TElevatorLayer, props: object): TMenuItem {
	const own = createAdapterContext(MenuItemDescriptor(), { props })
	const item = createAdapterContext(
		MenuCollectionItemDescriptor(),
		{ props },
		{ bundle: own.bundle },
	).use(TCollectionItemExtension, { item: own.instance, elevator: elevatorOf(layer) })

	accept([item, own])

	return own.instance
}

/** Меню «Изменить · Поделиться → (Ссылка, Почта)» разметкой. */
function tree() {
	const menuLayer = childOf()
	const root = mountMenu(menuLayer)
	const editLayer = childOf(menuLayer)
	const edit = mountItem(editLayer, { value: 'edit', text: 'Изменить' })
	const shareLayer = childOf(menuLayer)
	const share = mountSubmenu(shareLayer, { value: 'share', text: 'Поделиться' })
	const link = mountItem(childOf(shareLayer), { value: 'link', text: 'Ссылка' })
	const mail = mountItem(childOf(shareLayer), { value: 'mail', text: 'Почта' })

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
		const fax = mountItem(childOf(sendLayer), { value: 'fax' })

		expect(share.engine.extensions.batch.items).toEqual([send.submenu])
		expect(send.engine.extensions.batch.items).toEqual([fax])
	})
})
