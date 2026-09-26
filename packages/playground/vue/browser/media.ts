/**
 * Эмуляция медиазапросов Chromium — общее для спеков, которые смотрят, как тема
 * отвечает на настройки системы (`drawer.spec.ts`, `slider.spec.ts`).
 *
 * Эмуляция — та же, что в DevTools → Rendering: браузер отвечает на
 * медиазапрос так, будто настройку выбрали в системе. Снимается она значением
 * `no-preference` — его Playwright и держит по умолчанию, чтобы прогон не
 * зависел от настройки машины.
 *
 * Одна копия на всех, как у `colors.ts`: разойдись две, один спек молча
 * включал бы режим иначе, чем другой.
 */

import { cdp } from 'vitest/browser'

/** Режим «меньше движения»: `reduce` — система просит убрать движение. */
export const reducedMotion = (value: 'reduce' | 'no-preference'): Promise<unknown> =>
	cdp().send('Emulation.setEmulatedMedia', {
		features: [{ name: 'prefers-reduced-motion', value }],
	})
