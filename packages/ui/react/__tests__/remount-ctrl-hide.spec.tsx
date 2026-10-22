/**
 * Компонент над внешним `ctrl` переезжает в другое место дерева, и новое
 * место закрывает панель: вето прежнего спрашивают сразу, а `onHide` приходит
 * один раз, после сборки нового, — не посреди его рендера.
 *
 * Пример из жизни: подсказка в шапке, `ctrl` в сторе, раскладка телефона и
 * десктопа — разные родители. Отменяемое событие — вопрос, ответ нужен сейчас:
 * `preventDefault` прежнего отменяет закрытие, как вне перемонтирования.
 * Уведомление обмен прежнего отдаёт после сборки (`TAssembling`, setup), хотя
 * прежний к тому времени снят: закрылось при нём. React печатает
 * предупреждение о `setState` посреди чужого рендера раз на компонент за
 * прогон файла, поэтому сценарий — в своём файле.
 */

import { describe, it, expect, vi } from 'vitest'
import { act, useState } from 'react'
import { TPopover } from '@soldy-ui/core'
import type { TActionEvent } from '@soldy-ui/core'
import { Popover } from '@soldy-ui/react'
import { mount, nextFrame } from './mount'

describe('React: переезд Popover над тем же ctrl с закрытием', () => {
	it('переезд в другое место с закрытием: вето спрашивают сразу, onHide — один раз после сборки', async () => {
		const ctrl = new TPopover()
		let resize: (mobile: boolean) => void = () => {}
		let tour = false
		const onHide = vi.fn()
		const Header = () => {
			const [mobile, setMobile] = useState(false)
			const [, setLog] = useState<string[]>([])
			const popover = (
				<Popover
					ctrl={ctrl}
					visible={mobile ? false : undefined}
					onHide={() => {
						onHide()
						setLog((log) => [...log, 'закрыта'])
					}}
					onHideBefore={(event: TActionEvent) => {
						if (tour) event.preventDefault()
					}}
				>
					x
				</Popover>
			)

			resize = setMobile

			return mobile ? <header>{popover}</header> : <nav>{popover}</nav>
		}

		mount(<Header />)
		act(() => ctrl.show())

		// Идёт обучение: вето прежнего не даёт закрыть и при переезде
		tour = true
		act(() => resize(true))
		await nextFrame()

		expect(ctrl.visible).toBe(true)
		expect(onHide).not.toHaveBeenCalled()

		// Обучение кончилось: переезд обратно и снова на телефон — панель закрыта,
		// пользователь узнал об этом один раз
		tour = false
		act(() => resize(false))
		act(() => resize(true))
		await nextFrame()

		expect(ctrl.visible).toBe(false)
		expect(onHide).toHaveBeenCalledTimes(1)
	})
})
