/**
 * `ctrl` снаружи — это экземпляр компонента, а не фасад коллекции.
 *
 * У коллекционных компонентов `useAdapter` зовётся дважды: для самого
 * компонента и для фасада коллекции. Оба кладут в результат `ctrl`, `plugins` и
 * `rootElement`, и то, что окажется наверху, решал порядок спредов в `setup`.
 *
 * В шаблонах это не всплывает — они `ctrl` не используют. А вот потребителю с
 * `ref` на компонент подменённый `ctrl` достаётся молча: вместо `TListBox` он
 * получает `TListBoxCollectionFacade`, у которого нет ни `view`, ни `maxRows`.
 *
 * Select на это уже наступил и был починен перестановкой спредов — у себя
 * одного. Тест проверяет все четыре: чинить надо там, где можно ошибиться, а
 * порядок спредов ошибку допускает.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { TListBox, TSelect, TTabs, TAccordion } from '@soldy-ui/core'
import { ListBox, Select, Tabs, Accordion } from '@soldy-ui/vue'

// Не `ReturnType<typeof mount>`: `mount` перегружен, и утилита `ReturnType`
// берёт только последнюю (самую общую) перегрузку — без `ctrl` в результате.
// Для очистки после теста хватает структурного `unmount()`, а сам wrapper с
// точным типом живёт локально в каждом тесте.
let wrapper: { unmount(): void } | null = null

afterEach(() => {
	wrapper?.unmount()
	wrapper = null
	document.body.innerHTML = ''
})

const CASES = [
	['ListBox', () => mount(ListBox, { attachTo: document.body }), TListBox],
	['Select', () => mount(Select, { attachTo: document.body }), TSelect],
	['Tabs', () => mount(Tabs, { attachTo: document.body }), TTabs],
	['Accordion', () => mount(Accordion, { attachTo: document.body }), TAccordion],
] as const

describe('коллекционные компоненты отдают наружу свой инстанс', () => {
	it.each(CASES)('%s: ctrl — экземпляр компонента', (_name, mountComponent, Ctor) => {
		const w = mountComponent()

		wrapper = w

		expect(w.vm.ctrl).toBeInstanceOf(Ctor)
	})
})
