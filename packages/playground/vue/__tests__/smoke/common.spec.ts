/**
 * Дымовые проверки стенда, которые не принадлежат одному фреймворку: переход
 * между фреймворками, неизвестный адрес и то, что проверки фреймворков не
 * пусты. Проверки по фреймворку — `suite.ts`.
 */

import { describe, it, expect, vi } from 'vitest'
import { nextTick } from 'vue'
import { availableOf } from '../../src/catalog'
import { hostOf } from '../../src/hosts'
import {
	IDS,
	ariaLabels,
	enter,
	firstLines,
	nextFrame,
	openPage,
	rowOf,
	rowless,
	useSmokeHooks,
} from './harness'

useSmokeHooks()

/**
 * Проверки фреймворка идут только из его файла: фреймворк стенда без файла
 * остался бы без дымовых проверок молча.
 */
it('у каждого фреймворка стенда — свой файл спека', () => {
	const files = Object.keys(import.meta.glob('./*.spec.ts'))

	expect(IDS.filter((framework) => !files.includes(`./${framework}.spec.ts`))).toEqual([])
})

describe('страница компонента', () => {
	it('на неизвестный идентификатор отвечает, а не падает', async () => {
		const wrapper = await openPage('vue', 'нет-такого')

		expect(wrapper.find('.pg-empty').exists()).toBe(true)
	})

	/** Проверка страницы без строк (`suite.ts`) не вакуумна: такая страница есть. */
	it('страница без строк есть: DragAndDrop у Vue', () => {
		const pages = IDS.flatMap((framework) =>
			availableOf(hostOf(framework))
				.filter(rowless)
				.map((entry) => `${framework}/${entry.id}`),
		)

		expect(pages).toContain('vue/drag-and-drop')
	})
})

/**
 * Состояние страницы держит оболочка: строка, её значение, экземпляр ядра.
 * Смена фреймворка перемонтирует только сцены — хост нового фреймворка
 * получает в первой колонке значение строки пропом, а во второй тот же
 * экземпляр, в плагин которого строка пишет значение заново.
 */
describe('смена фреймворка', () => {
	it('значение строки переживает её: aria_label у Button, Vue → React, обе колонки', async () => {
		const wrapper = await openPage('vue', 'button')

		await enter(rowOf(wrapper, 'aria_label'), 'Закрыть')
		expect(ariaLabels(rowOf(wrapper, 'aria_label'))).toEqual(['Закрыть', 'Закрыть'])

		const before = rowOf(wrapper, 'aria_label').element
		const draw = vi.spyOn(hostOf('react'), 'mount')

		await wrapper.setProps({ framework: 'react' })
		await nextTick()
		await nextFrame()

		const row = rowOf(wrapper, 'aria_label')
		const drawn = draw.mock.calls.filter(([node]) => row.element.contains(node))

		draw.mockRestore()

		// Строка та же, а обе сцены нарисовал хост React: первая получила
		// значение пропом, вторая — экземпляр, в плагин которого его пишет строка
		expect(row.element).toBe(before)
		expect(drawn.map(([, mounted]) => mounted.props.aria_label)).toEqual(['Закрыть', undefined])
		expect(ariaLabels(row)).toEqual(['Закрыть', 'Закрыть'])
		expect(firstLines()).toEqual([])
	})
})
