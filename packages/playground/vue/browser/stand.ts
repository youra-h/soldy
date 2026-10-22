/**
 * Стенд целиком — оболочка с роутером — для спеков, которые смотрят на его
 * страницы (`svelte-host.spec.ts`, `angular-host.spec.ts`, `webc-host.spec.ts`,
 * `drag-and-drop.spec.ts`, `field-preview.spec.ts`, `tags-preview.spec.ts`,
 * `narrow-window.spec.ts`).
 *
 * Монтирует его своё приложение Vue, а не `render` из `vitest-browser-vue`.
 * Тот монтирует через `@vue/test-utils`, а `mount` у неё подключается к
 * глобальному хуку devtools Vue и записывает каждый `emit` каждого приложения
 * на странице вместе с аргументами. Стираются записи только приложения,
 * которое смонтировала она сама. Превью стенда — отдельные приложения хоста
 * Vue, и записи их событий жили до конца файла. События DOM в аргументах
 * держат свой путь, и с ним узлы всех страниц, с которых тест ушёл. В
 * `svelte-host.spec.ts` к концу файла копилось 1,7 ГБ живой кучи и 600 тысяч
 * узлов, рендерер вкладки дорастал до 4,6 ГБ, и в CI вкладка падала на одном
 * из следующих файлов (`VITEST_BROWSER_CONNECTION_CLOSED`).
 *
 * Журнал колонок (`ComponentPage.vue`) печатает события с аргументами —
 * экземплярами ядра и плагинов. Консоль страницы держит залогированное, пока к
 * ней подключён протокол DevTools, а в прогон она не пересылается
 * (`disableConsoleIntercept` в `vitest.browser.config.ts`). Поэтому на время
 * теста журнал заглушён, а после теста шпион снят: вызовы, накопленные в нём,
 * держали бы те же экземпляры.
 */

import { onTestFinished, vi } from 'vitest'
import { createApp } from 'vue'
import App from '../src/App.vue'
import { router } from '../src/router'

/** Монтирует стенд на текущий тест; после теста он снят, узел убран. */
export function renderStand(): void {
	const silent = vi.spyOn(console, 'log').mockImplementation(() => {})
	const node = document.createElement('div')
	const app = createApp(App).use(router)

	document.body.append(node)
	app.mount(node)

	onTestFinished(() => {
		app.unmount()
		node.remove()
		silent.mockRestore()
	})
}
