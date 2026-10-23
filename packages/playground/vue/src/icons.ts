/**
 * @license
 * The glyphs are Material Symbols by Google (https://fonts.google.com/icons),
 * style Rounded, © Google, licensed under the Apache License, Version 2.0
 * (https://www.apache.org/licenses/LICENSE-2.0).
 *
 * Changes to the source SVG files: the root `<svg>` element is dropped together
 * with its size, and its `fill` moves to a group around the inner markup as a
 * reference to the icon color of the theme with the source color as the
 * fallback (`var(--so-icon-color, #1f1f1f)`).
 */

import { defineComponent, h, markRaw, type Component } from 'vue'
import type { TIconSource } from '@soldy-ui/setup'

/**
 * Глифы оболочки стенда: кнопки «Меню» и «Настройки» в шапке узкого окна.
 *
 * Ролей под них у библиотеки нет, и ради стенда они не появляются: глифы
 * нужны только оболочке, а не компонентам (`packages/playground/AGENTS.md`,
 * «Playground: инструмент не диктует библиотеке»). Поэтому их нет ни в
 * пакете иконок, ни в реестре (`useIcons`): реестр меняет переключатель
 * «Иконки», а глифы оболочки от выбранного пакета не зависят.
 *
 * Набор и стиль те же, что у `@soldy-ui/icons-material`, — Material Symbols
 * Rounded, — и формат тот же: данные `TIconSource`, корень `<svg>` строит
 * компонент глифа, а покраска — ссылка на цвет иконки темы с цветом исходника
 * запасным, как у пакета (`docs/agents/theming.md`, «Пакеты иконок»): цвет
 * текста кнопкам шапки даёт тема.
 */
const menu: TIconSource = {
	viewBox: '0 -960 960 960',
	body: '<g fill="var(--so-icon-color, #1f1f1f)"><path d="M160-240q-17 0-28.5-11.5T120-280q0-17 11.5-28.5T160-320h640q17 0 28.5 11.5T840-280q0 17-11.5 28.5T800-240H160Zm0-200q-17 0-28.5-11.5T120-480q0-17 11.5-28.5T160-520h640q17 0 28.5 11.5T840-480q0 17-11.5 28.5T800-440H160Zm0-200q-17 0-28.5-11.5T120-680q0-17 11.5-28.5T160-720h640q17 0 28.5 11.5T840-680q0 17-11.5 28.5T800-640H160Z"/></g>',
}

const settings: TIconSource = {
	viewBox: '0 -960 960 960',
	body: '<g fill="var(--so-icon-color, #1f1f1f)"><path d="M433-80q-27 0-46.5-18T363-142l-9-66q-13-5-24.5-12T307-235l-62 26q-25 11-50 2t-39-32l-47-82q-14-23-8-49t27-43l53-40q-1-7-1-13.5v-27q0-6.5 1-13.5l-53-40q-21-17-27-43t8-49l47-82q14-23 39-32t50 2l62 26q11-8 23-15t24-12l9-66q4-26 23.5-44t46.5-18h94q27 0 46.5 18t23.5 44l9 66q13 5 24.5 12t22.5 15l62-26q25-11 50-2t39 32l47 82q14 23 8 49t-27 43l-53 40q1 7 1 13.5v27q0 6.5-2 13.5l53 40q21 17 27 43t-8 49l-48 82q-14 23-39 32t-50-2l-60-26q-11 8-23 15t-24 12l-9 66q-4 26-23.5 44T527-80h-94Zm7-80h79l14-106q31-8 57.5-23.5T639-327l99 41 39-68-86-65q5-14 7-29.5t2-31.5q0-16-2-31.5t-7-29.5l86-65-39-68-99 42q-22-23-48.5-38.5T533-694l-13-106h-79l-14 106q-31 8-57.5 23.5T321-633l-99-41-39 68 86 64q-5 15-7 30t-2 32q0 16 2 31t7 30l-86 65 39 68 99-42q22 23 48.5 38.5T427-266l13 106Zm42-180q58 0 99-41t41-99q0-58-41-99t-99-41q-59 0-99.5 41T342-480q0 58 40.5 99t99.5 41Zm-2-140Z"/></g>',
}

/**
 * Компонент глифа — корень `<svg>` для `<Icon :tag>`, как у `roleIcon` адаптера
 * Vue (`ui/vue/src/adapter/common/icon.ts`): разметку строит `h()`, а не
 * `template`, содержимое — `innerHTML`, источник доверенный. Отличие одно:
 * глиф не ищется в реестре на отрисовке, он здесь и не меняется.
 *
 * Компонент строится однажды, на модуль: новый на каждую отрисовку Vue
 * пересоздавал бы узел (см. иконку превью Icon в `hosts/vue/previews.ts`).
 */
function glyph(name: string, source: TIconSource): Component {
	return markRaw(
		defineComponent({
			name: `Glyph_${name}`,
			render: () => h('svg', { viewBox: source.viewBox, innerHTML: source.body }),
		}),
	)
}

/** Бургер — кнопка, которая открывает панель меню. */
export const MENU_GLYPH = glyph('menu', menu)

/** Шестерёнка — кнопка, которая открывает панель настроек. */
export const SETTINGS_GLYPH = glyph('settings', settings)
