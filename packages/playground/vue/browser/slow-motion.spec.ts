/**
 * Замедленная сцена страницы тестов — `slowMotion`
 * (`playground/shared/src/scenarios/motion.ts`).
 *
 * Ручные сценарии темы `motion` смотрят переходы темы в десять раз медленнее:
 * переход тоста длится десятые доли секунды, и кто куда едет, на обычной
 * скорости не разглядеть. Замедляет стенд, а не тема, — скоростью Web
 * Animations, — и только то, что под корнем сцены. Корень — селектор: регион
 * тостов телепортирован в `body`, мимо сцены. Web Animations у jsdom нет,
 * поэтому спек — в браузере.
 */

import { it, expect, onTestFinished } from 'vitest'
import { slowMotion } from '@soldy-ui/playground-shared'

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

/** Узел в конце документа; снимается после теста. */
const append = (className: string): HTMLElement => {
	const element = document.createElement('div')

	element.className = className
	document.body.append(element)
	onTestFinished(() => element.remove())

	return element
}

/** Переход прозрачности на секунду — тем же путём, что у темы: смена стиля. */
const fade = async (element: HTMLElement): Promise<Animation> => {
	element.style.transition = 'opacity 1s linear'
	await nextFrame()
	element.style.opacity = '0'

	const [transition, ...rest] = element.getAnimations()

	if (!transition || rest.length > 0) throw new Error('перехода нет или их несколько')

	return transition
}

it('переходы под корнем идут в десять раз медленнее, пока прогон не отменён', async () => {
	const region = append('pg-slow-region')
	const controller = new AbortController()
	const run = slowMotion({ signal: controller.signal, frame: nextFrame }, '.pg-slow-region')

	// Узел и переход появились уже после старта прогона, как тост под кнопкой
	const inside = await fade(region.appendChild(document.createElement('div')))
	const outside = await fade(append('pg-slow-outside'))

	await nextFrame()

	expect(inside.playbackRate, 'под корнем').toBe(0.1)
	expect(outside.playbackRate, 'вне корня').toBe(1)

	controller.abort()
	await run

	expect(inside.playbackRate, 'после отмены').toBe(1)
})
