/**
 * Обработчик уведомления прежнего компонента над тем же `ctrl`, меняющий
 * состояние родителя, при перемонтировании зовётся после сборки нового, а не
 * посреди его рендера.
 *
 * Сборка нового пишет в `ctrl` свои `id`, и прежний слышит `change:aria`.
 * Уведомление обмен прежнего отдаёт после сборки (`TAssembling`, setup) — и
 * отдаёт, хотя прежний к тому времени снят: событие случилось при нём. Посреди
 * рендера `setState` родителя дал бы «Cannot update a component while
 * rendering a different component» — его роняет сторож консоли. React печатает
 * его раз на компонент за прогон файла, поэтому сценарий — в своём файле.
 */

import { describe, it, expect, vi } from 'vitest'
import { act, useState } from 'react'
import { TPopover } from '@soldy-ui/core'
import { Popover } from '@soldy-ui/react'
import { mount, nextFrame } from './mount'

describe('React: уведомление прежнего при перемонтировании над тем же ctrl', () => {
	it('обработчик уведомления прежнего, меняющий состояние родителя, зовётся после сборки', async () => {
		const ctrl = new TPopover()
		let move: (key: string) => void = () => {}
		const onChangeAria = vi.fn()
		const Page = () => {
			const [key, setKey] = useState('a')
			const [, setSeen] = useState(0)

			move = setKey

			return (
				<Popover
					key={key}
					ctrl={ctrl}
					onChangeAria={() => {
						onChangeAria()
						setSeen((seen) => seen + 1)
					}}
				>
					x
				</Popover>
			)
		}

		mount(<Page />)
		act(() => move('b'))
		await nextFrame()

		// Прежний услышал новые id — один раз, после сборки, а не посреди рендера нового
		expect(onChangeAria).toHaveBeenCalledTimes(1)
	})
})
