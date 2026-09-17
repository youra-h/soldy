/**
 * Сторож ошибок окна: событие `error` на `window` во время теста роняет этот
 * тест.
 *
 * Браузер шлёт `error` на `window` не только на брошенное исключение. Так же
 * приходит `ResizeObserver loop completed with undelivered notifications`: у
 * такого события нет поля `error`, и Vitest
 * (`@vitest/browser/dist/client/error-catcher.js`) его только печатает. Прогон
 * при этом оставался зелёным, а у потребителя то же событие получает трекер
 * ошибок.
 *
 * Фильтра по тексту нет намеренно. Пока на `window` висит чужой слушатель
 * `error`, Vitest ошибки окна не считает вовсе, и всё, что пропустил бы
 * сторож, не заметил бы никто. Шумит сторож — чинится причина, а не он.
 *
 * Хук общий для всех браузерных спеков (`setupFiles` в
 * `vitest.browser.config.ts`), иначе каждому новому спеку пришлось бы помнить
 * о слушателе.
 */

import { afterEach, beforeEach, expect } from 'vitest'
import { useTheme } from '@soldy/setup'
import oren from '@soldy/theme-oren/setup'

/**
 * Поведение темы oren — как в точке входа стенда (`src/main.ts`): стили
 * спеки подключают сами, а плагины темы (полоса под активным табом) ставит
 * регистрация.
 */
useTheme(oren)

/** Тексты событий `error`, пришедших на `window` за текущий тест. */
let messages: string[] = []

/**
 * Событие не гасится (`preventDefault`): в консоли браузера оно остаётся
 * таким, каким его увидел бы потребитель.
 */
const collect = (event: ErrorEvent): void => {
	messages.push(event.message)
}

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

beforeEach(() => {
	messages = []
	window.addEventListener('error', collect)
})

afterEach(async () => {
	// Уведомления `ResizeObserver` и ошибка о недоставленных приходят в шаге
	// отрисовки кадра, после колбэков `requestAnimationFrame`. Первый кадр
	// застаёт этот шаг ещё впереди, второй начинается, когда он уже прошёл.
	await nextFrame()
	await nextFrame()

	// Только `removeEventListener`, не `signal` и не `once`: Vitest считает
	// чужих слушателей по вызовам `addEventListener`/`removeEventListener`, и
	// слушатель, снятый мимо них, навсегда выключил бы его учёт ошибок окна.
	window.removeEventListener('error', collect)

	expect(messages, 'на window пришли события error').toEqual([])
})
