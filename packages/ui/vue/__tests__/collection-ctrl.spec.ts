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
import { TListBox, TSelect, TTabs, TAccordion } from '@soldy/core'
import { ListBox, Select, Tabs, Accordion } from '@soldy/ui-vue'

let wrapper: ReturnType<typeof mount> | null = null

afterEach(() => {
	wrapper?.unmount()
	wrapper = null
	document.body.innerHTML = ''
})

const CASES = [
	['ListBox', ListBox, TListBox],
	['Select', Select, TSelect],
	['Tabs', Tabs, TTabs],
	['Accordion', Accordion, TAccordion],
] as const

describe('коллекционные компоненты отдают наружу свой инстанс', () => {
	it.each(CASES)('%s: ctrl — экземпляр компонента', (_name, Component, Ctor) => {
		wrapper = mount(Component as never, { attachTo: document.body })

		expect((wrapper.vm as unknown as { ctrl: unknown }).ctrl).toBeInstanceOf(Ctor)
	})
})
