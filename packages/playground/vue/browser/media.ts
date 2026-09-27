/**
 * Эмуляция медиазапросов Chromium — общее для спеков, которые смотрят, как тема
 * отвечает на настройки системы (`drawer.spec.ts`, `slider.spec.ts`,
 * `forced-colors.spec.ts`, `progress-spinner.spec.ts`).
 *
 * Эмуляция — та же, что в DevTools → Rendering: браузер отвечает на
 * медиазапрос так, будто настройку выбрали в системе. Снимается она значением
 * по умолчанию, которое держит и Playwright, чтобы прогон не зависел от
 * настройки машины: `no-preference` у движения, `none` у принудительных
 * цветов.
 *
 * Вызов CDP заменяет весь список эмулируемых признаков, а признак, которого в
 * списке нет, возвращается к настройке машины. Поэтому каждый вызов отсюда
 * отдаёт оба признака сразу — заданный и текущий другой. Отдельный вызов на
 * признак снимал бы эмуляцию соседа: сброс принудительных цветов после сброса
 * движения оставлял следующим тестам движение машины, и на машине с
 * выключенной анимацией переходы темы пропадали.
 *
 * Одна копия на всех, как у `colors.ts`: разойдись две, один спек молча
 * включал бы режим иначе, чем другой.
 */

import { cdp } from 'vitest/browser'

/** Эмулируемые признаки и их текущие значения — все, что ведёт этот модуль. */
const emulated = {
	'prefers-reduced-motion': 'no-preference',
	'forced-colors': 'none',
}

/** Отдать браузеру весь список признаков разом. */
const emulate = (): Promise<unknown> =>
	cdp().send('Emulation.setEmulatedMedia', {
		features: Object.entries(emulated).map(([name, value]) => ({ name, value })),
	})

/** Режим «меньше движения»: `reduce` — система просит убрать движение. */
export const reducedMotion = (value: 'reduce' | 'no-preference'): Promise<unknown> => {
	emulated['prefers-reduced-motion'] = value

	return emulate()
}

/**
 * Режим принудительных цветов (высокий контраст Windows): `active` — палитру
 * страницы выбирает система. Эмуляция меняет не только ответ медиазапроса, но
 * и сами цвета: системные ключевые слова (`Highlight`, `GrayText`) берут
 * значения палитры режима.
 */
export const forcedColors = (value: 'active' | 'none'): Promise<unknown> => {
	emulated['forced-colors'] = value

	return emulate()
}
