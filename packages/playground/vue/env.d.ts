/// <reference types="vite/client" />

/** Версия библиотеки — константа сборки из манифеста ядра (`constants` в `vite.base.ts`). */
declare const __SOLDY_VERSION__: string

/**
 * Общий слой тем: вход пакета — CSS (`exports["."]` ведёт в `src/index.css`),
 * типов у него нет. Подключает его только спек «база без темы»
 * (`browser/theme-base-controls.spec.ts`), побочным импортом, как лист темы.
 */
declare module '@soldy-ui/theme-base' {}

declare module '*.vue' {
	import type { Component } from 'vue'

	const component: Component

	export default component
}
