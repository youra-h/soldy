/**
 * Отметка CheckBox во Vue — `svg` иконки по роли, а не компонент Icon.
 *
 * Отметка появляется и пропадает с каждой сменой значения. Icon на её месте
 * собирал свой адаптерный контекст и плагины на каждую смену, и в таблице на
 * 5000 строк «выбрать все» собирала 5000 иконок — треть времени выбора
 * (BENCHMARKS.md, 869feq9un). Размер отметке даёт тема флажка по
 * `s-check-box__mark`.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref, type ComponentOptions } from 'vue'
import * as material from '@soldy-ui/icons-material'
import { CheckBox } from '@soldy-ui/vue'
import { useIcon } from '../src/adapter'

let wrapper: ReturnType<typeof mount> | null = null

afterEach(() => {
	wrapper?.unmount()
	wrapper = null
})

/** Содержимое `<svg>` иконки так, как его сериализует документ. */
function bodyOf(source: { body: string }): string {
	const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')

	svg.innerHTML = source.body

	return svg.innerHTML
}

/** Отметка в коробке флажка; нет её — `null`. */
function markOf(): SVGSVGElement | null {
	return wrapper?.element.querySelector('.s-check-box__container svg') ?? null
}

describe('CheckBox · отметка', () => {
	it('выбранный — svg роли check с классом отметки, частично выбранный — checkIndeterminate', async () => {
		const value = ref(true)
		const indeterminate = ref(false)

		wrapper = mount(
			defineComponent({
				render: () =>
					h(CheckBox, { value: value.value, indeterminate: indeterminate.value }),
			}),
		)

		expect(markOf()?.getAttribute('viewBox')).toBe(material.check.viewBox)
		expect(markOf()?.innerHTML).toBe(bodyOf(material.check))
		expect(markOf()?.classList.contains('s-check-box__mark')).toBe(true)

		indeterminate.value = true
		await nextTick()

		expect(markOf()?.innerHTML).toBe(bodyOf(material.checkIndeterminate))

		indeterminate.value = false
		value.value = false
		await nextTick()

		expect(markOf()).toBeNull()
	})

	it('смена отметки не монтирует Icon', async () => {
		let icons = 0
		const counter: ComponentOptions = {
			mounted() {
				if (this.$options.name === '_Icon') icons++
			},
		}
		const value = ref(false)

		wrapper = mount(defineComponent({ render: () => h(CheckBox, { value: value.value }) }), {
			global: { mixins: [counter] },
		})

		for (const next of [true, false, true, false]) {
			value.value = next
			await nextTick()
		}

		expect(icons).toBe(0)
	})

	/**
	 * Роль читается на отрисовке, поэтому компонент на роль один на модуль:
	 * новый на каждый вызов умножался бы на экземпляры чекбоксов.
	 */
	it('компонент иконки роли — один на роль', () => {
		expect(useIcon('check')).toBe(useIcon('check'))
		expect(useIcon('check')).not.toBe(useIcon('checkIndeterminate'))
	})
})
