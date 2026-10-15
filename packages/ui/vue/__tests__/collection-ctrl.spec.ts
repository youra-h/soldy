/**
 * `ctrl` снаружи — это экземпляр компонента, а не фасад коллекции.
 *
 * У коллекционных компонентов контекстов два: свой и фасада коллекции, и оба
 * собирают привязки шаблона. Раньше оба клали в результат `ctrl`, и то, что
 * окажется наверху, решал порядок спредов в `setup`: потребитель с `ref` на
 * компонент молча получал вместо `TListBox` фасад `TListBoxCollectionFacade`,
 * у которого нет ни `view`, ни `maxRows`. Select на это наступил первым.
 *
 * Теперь `ctrl` фасада в привязки не попадает (`useCollectionAdapter`), а
 * экземпляр из `ref` закрыт и привязок не отдаёт вовсе — ни компонента, ни
 * фасада (`root-ref.spec.ts`). Здесь — на своих данных: внешний `ctrl` ведёт
 * сам компонент, его состояние доходит до корня, а `ref` его не отдаёт.
 * Проверяются все четыре: ошибиться в порядке мог каждый.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, shallowRef, type Component } from 'vue'
import { TAccordion, TListBox, TSelect, TTabs } from '@soldy-ui/core'
import { Accordion, ListBox, Select, Tabs } from '@soldy-ui/vue'

let wrapper: { unmount(): void } | null = null

afterEach(() => {
	wrapper?.unmount()
	wrapper = null
	document.body.innerHTML = ''
})

/** Компонент, его экземпляр ядра и класс корня. */
const CASES: ReadonlyArray<readonly [string, Component, () => { hide(): void }, string]> = [
	['ListBox', ListBox, () => new TListBox(), '.so-list-box'],
	['Select', Select, () => new TSelect(), '.so-select'],
	['Tabs', Tabs, () => new TTabs(), '.so-tabs'],
	['Accordion', Accordion, () => new TAccordion(), '.so-accordion'],
]

describe('коллекционные компоненты: внешний ctrl — экземпляр компонента', () => {
	it.each(CASES)('%s: состояние ctrl доходит до корня', async (_name, view, create, selector) => {
		const ctrl = create()

		wrapper = mount(defineComponent({ render: () => h(view, { ctrl }) }), {
			attachTo: document.body,
		})

		const root = document.querySelector(selector)

		if (!(root instanceof HTMLElement)) throw new Error(`${selector}: корня нет`)

		expect(root.style.display).not.toBe('none')

		ctrl.hide()
		await nextTick()

		expect(root.style.display).toBe('none')
	})

	it.each(CASES)('%s: ref ctrl не отдаёт', (_name, view, create) => {
		const host = shallowRef<object | null>(null)

		wrapper = mount(defineComponent({ render: () => h(view, { ctrl: create(), ref: host }) }), {
			attachTo: document.body,
		})

		expect(host.value).not.toBeNull()
		expect('ctrl' in (host.value ?? {})).toBe(false)
	})
})
