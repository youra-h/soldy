/**
 * Ручка Switch во Vue — слоты `on` и `off`.
 *
 * В ручке — слот текущего значения: `off` у выключенного, `on` у включённого.
 * Меняется он сразу, той же перерисовкой, что и значение, — как у соседних
 * адаптеров (группа «Switch · роль и ручка» в их `checkable.spec.*`). Раньше
 * смену во Vue вёл встроенный переход фреймворка, `<transition mode="out-in">`:
 * новый слот вставал, только когда догаснет старый, а в остальных пяти
 * адаптерах — сразу.
 *
 * Заглушка перехода, которую `@vue/test-utils` ставит по умолчанию, рисует
 * детей сразу, и отложенной смены на ней не видно. Поэтому она снята
 * (`REAL_TRANSITION`): вернись переход в разметку — тест его увидит.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { h, nextTick } from 'vue'
import { TSwitch, type ISwitch } from '@soldy-ui/core'
import { Switch } from '@soldy-ui/vue'

let wrapper: ReturnType<typeof mount> | null = null

afterEach(() => {
	wrapper?.unmount()
	wrapper = null
})

/** Переход Vue — настоящий, а не заглушка `@vue/test-utils` (см. шапку). */
const REAL_TRANSITION = { stubs: { transition: false } }

/** Содержимое ручки. */
function thumb(): string {
	const node = wrapper?.element.querySelector('.so-switch__track--thumb')

	if (!(node instanceof HTMLElement)) throw new Error('ручки нет')

	return node.innerHTML
}

describe('Switch · ручка', () => {
	it('в ручке — слот off у выключенного и on у включённого, смена — сразу', async () => {
		const ctrl = new TSwitch()

		wrapper = mount(Switch, {
			props: { ctrl },
			slots: { on: () => h('i', 'вкл'), off: () => h('i', 'выкл') },
			global: REAL_TRANSITION,
		})

		expect(thumb()).toBe('<i>выкл</i>')

		ctrl.value = true
		await nextTick()

		expect(thumb()).toBe('<i>вкл</i>')

		ctrl.value = false
		await nextTick()

		expect(thumb()).toBe('<i>выкл</i>')
	})

	it('слоты получают scope — значение и инстанс', () => {
		const ctrl = new TSwitch({ value: true })
		const on = (scope: { value: boolean | undefined; ctrl: ISwitch }) =>
			h('i', `${scope.value}:${scope.ctrl === ctrl}`)

		wrapper = mount(Switch, { props: { ctrl }, slots: { on }, global: REAL_TRANSITION })

		expect(thumb()).toBe('<i>true:true</i>')
	})

	it('без слотов ручка пуста', () => {
		wrapper = mount(Switch, { global: REAL_TRANSITION })

		expect(thumb()).toBe('')
	})
})
