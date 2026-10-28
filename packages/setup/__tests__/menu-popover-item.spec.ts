/**
 * Пункт с панелью (`Menu.PopoverItem`), собранный дескриптором так, как его
 * собирают адаптеры: свой контекст и фасад пункта на одном наборе, вход в
 * коллекцию меню через лифт. Своей коллекции у пункта нет — в панели лежит
 * что угодно, — и лифт он не опускает.
 *
 * Модель пункта и переходы плагинов проверяют ядро и плагины
 * (`core/__tests__/menu.spec.ts`, `plugins/__tests__/menu-popover-item.plugin.spec.ts`);
 * здесь — что дескриптор складывает набор, с которым пункт работает в меню:
 * модель фокуса, клавиша строки, нажатие мимо и связки, — что набор стоит в
 * реестре меню (по нему меню слушает Tab из панели) и что коллекция меню,
 * собранная разметкой, держит одну панель на меню вместе с подменю.
 */

import { describe, it, expect } from 'vitest'
import { TMenu, TMenuSubmenu } from '@soldy-ui/core'
import type { IMenuItem, TCollectionEngine } from '@soldy-ui/core'
import {
	TCollectionBundlesPlugin,
	TDismissPlugin,
	TMenuPopoverItemFocusPlugin,
	TMenuPopoverItemKeyboardPlugin,
	TMenuPopupIdsPlugin,
} from '@soldy-ui/plugins'
import {
	MenuCollectionDescriptor,
	MenuCollectionItemDescriptor,
	MenuDescriptor,
	MenuItemDescriptor,
	MenuPopoverItemDescriptor,
	MenuSubmenuCollectionDescriptor,
	MenuSubmenuDescriptor,
} from '../content/descriptors'
import { TCollectionExtension, TCollectionItemExtension } from '../content/extensions'
import { createAdapterContext } from '../protected/adapter'
import type { IAdapterContext, TElevatorFactory } from '../protected/adapter'
import { CommonProfile } from '../protected/naming'
import { createElevatorFactory, required } from './helpers'

/** Принять контексты, как рантайм адаптера: подписка на состояние и `attach`. */
function accept(contexts: readonly IAdapterContext[]): () => void {
	const offs = contexts.map((context) => context.connect(CommonProfile).state.subscribe(() => {}))

	for (const context of contexts) context.attach()

	return () => {
		offs.forEach((off) => off())

		for (const context of contexts) context.destroy()
	}
}

/** Меню — свой контекст и фасад меню на его наборе: фасад опускает коллекцию. */
function mountMenu(elevator: TElevatorFactory) {
	const menu = new TMenu({ open: true })
	const own = createAdapterContext(MenuDescriptor(), { ctrl: menu })
	const facade = createAdapterContext(
		MenuCollectionDescriptor(),
		{ options: { owner: own.instance } },
		{ bundle: own.bundle },
	).use(TCollectionExtension, { elevator })

	accept([own, facade])

	const engine: TCollectionEngine<IMenuItem, any> = facade.instance.engine

	return { menu, engine, bundles: required(own.bundle?.get(TCollectionBundlesPlugin), 'реестр') }
}

/** Пункт-действие разметкой — свой контекст и фасад пункта. */
function mountAction(elevator: TElevatorFactory, props: object) {
	const own = createAdapterContext(MenuItemDescriptor(), { props })
	const item = createAdapterContext(
		MenuCollectionItemDescriptor(),
		{ props },
		{ bundle: own.bundle },
	).use(TCollectionItemExtension, { adapter: own, elevator })

	accept([item, own])

	return own.instance
}

/** Пункт с панелью разметкой — так же, как пункт: свой контекст и фасад пункта. */
function mountPopoverItem(elevator: TElevatorFactory, props: object) {
	const own = createAdapterContext(MenuPopoverItemDescriptor(), { props })
	const item = createAdapterContext(
		MenuCollectionItemDescriptor(),
		{ props },
		{ bundle: own.bundle },
	).use(TCollectionItemExtension, { adapter: own, elevator })

	return { instance: own.instance, bundle: own.bundle, unmount: accept([item, own]) }
}

/**
 * Пункт с подменю — пункт меню и владелец своих пунктов. Монтируется
 * последним: лифт здесь плоский, и коллекция, которую подменю опускает своим
 * пунктам, легла бы поверх коллекции меню.
 */
function mountSubmenu(elevator: TElevatorFactory): TMenuSubmenu {
	const submenu = new TMenuSubmenu({ value: 'share', text: 'Поделиться' })
	const own = createAdapterContext(MenuSubmenuDescriptor(), { ctrl: submenu })
	const item = createAdapterContext(
		MenuCollectionItemDescriptor(),
		{},
		{ bundle: own.bundle },
	).use(TCollectionItemExtension, { adapter: own, elevator })
	const facade = createAdapterContext(
		MenuSubmenuCollectionDescriptor(),
		{ options: { owner: own.instance } },
		{ bundle: own.bundle },
	).use(TCollectionExtension, { elevator })

	accept([item, own, facade])

	return submenu
}

/** Меню «Изменить · Срок → (содержимое) · Поделиться → (…)» разметкой. */
function tree() {
	const { factory } = createElevatorFactory()
	const root = mountMenu(factory)
	const edit = mountAction(factory, { value: 'edit', text: 'Изменить' })
	const due = mountPopoverItem(factory, { value: 'due', text: 'Срок' })
	const share = mountSubmenu(factory)

	return { root, edit, due, item: due.instance, share }
}

describe('пункт с панелью — пункт меню со своей панелью', () => {
	it('входит в коллекцию меню, как пункт: вне обхода Tab, размер — меню', () => {
		const { root, edit, item, share } = tree()

		expect(root.engine.extensions.batch.items).toEqual([edit, item, share])
		expect(item.aria.get('tabindex')).toBe('-1')

		root.menu.size = 'lg'

		expect(item.size).toBe('lg')
	})

	it('набор — модель фокуса, клавиша строки, нажатие мимо и связки: панель названа строкой', () => {
		const { due, item } = tree()

		expect(due.bundle?.get(TMenuPopoverItemFocusPlugin)).toBeInstanceOf(
			TMenuPopoverItemFocusPlugin,
		)
		expect(due.bundle?.get(TMenuPopoverItemKeyboardPlugin)).toBeInstanceOf(
			TMenuPopoverItemKeyboardPlugin,
		)
		expect(due.bundle?.get(TDismissPlugin)).toBeInstanceOf(TDismissPlugin)
		expect(due.bundle?.get(TMenuPopupIdsPlugin)).toBeInstanceOf(TMenuPopupIdsPlugin)

		const rowId = item.aria.get('id')

		expect(rowId).toMatch(/-row$/)
		expect(item.aria.get('aria-haspopup')).toBe('dialog')
		expect(item.panelAria.toObject()).toEqual({
			role: 'dialog',
			id: item.aria.get('aria-controls'),
			'aria-labelledby': rowId,
		})
	})

	it('набор пункта — в реестре меню: по нему меню слушает Tab из его панели', () => {
		const { root, due, item } = tree()

		expect(root.bundles.getByUid(item.uid)).toBe(due.bundle)
	})

	it('открыта одна панель на меню: пункт с панелью и подменю закрывают друг друга', () => {
		const { root, item, share } = tree()

		share.open = true
		item.open = true

		expect([item.open, share.open]).toEqual([true, false])
		expect(root.engine.extensions.menu.opened).toBe(item)

		share.open = true

		expect([item.open, share.open]).toEqual([false, true])

		item.open = true
		root.menu.open = false

		expect([item.open, share.open]).toEqual([false, false])
	})

	it('снятый пункт уходит из меню и из его реестра', () => {
		const { root, edit, due, item, share } = tree()

		due.unmount()

		expect(root.engine.extensions.batch.items).toEqual([edit, share])
		expect(root.bundles.getByUid(item.uid)).toBeUndefined()
	})
})
