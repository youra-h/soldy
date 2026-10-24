/// <reference types="vite/client" />

/** Версия библиотеки — константа сборки из манифеста ядра (`constants` в `vite.base.ts`). */
declare const __SOLDY_VERSION__: string

/**
 * Общий слой тем: вход пакета — CSS (`exports["."]` ведёт в `src/index.css`),
 * типов у него нет. Подключают его только спеки «база без темы»
 * (`browser/theme-base-controls.spec.ts`, `browser/theme-base-fields.spec.ts`,
 * `browser/theme-base-layers.spec.ts`, `browser/theme-base-scales.spec.ts`,
 * `browser/theme-base-dates.spec.ts`, `browser/theme-base-table.spec.ts`),
 * побочным импортом, как лист темы.
 */
declare module '@soldy-ui/theme-base' {}

declare module '*.vue' {
	import type { Component } from 'vue'

	const component: Component

	export default component
}
