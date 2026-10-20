/// <reference types="vite/client" />

/** Версия библиотеки — константа сборки из манифеста ядра (`constants` в `vite.base.ts`). */
declare const __SOLDY_VERSION__: string

declare module '*.vue' {
	import type { Component } from 'vue'

	const component: Component

	export default component
}
