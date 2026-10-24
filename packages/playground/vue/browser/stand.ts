/**
 * Стенд целиком — оболочка с роутером — для спеков, которые смотрят на его
 * страницы (`svelte-host.spec.ts`, `angular-host.spec.ts`, `webc-host.spec.ts`,
 * `drag-and-drop.spec.ts`, `field-preview.spec.ts`, `tags-preview.spec.ts`,
 * `narrow-window.spec.ts`).
 *
 * Монтирует его `render` спеков (`browser/render.ts`) — своим приложением Vue,
 * как и всё остальное в браузерных спеках. Через `@vue/test-utils` записи
 * событий превью стенда — отдельных приложений хоста Vue — жили до конца
 * файла: в `svelte-host.spec.ts` копилось 1,7 ГБ живой кучи и 600 тысяч узлов,
 * рендерер вкладки дорастал до 4,6 ГБ, и в CI вкладка падала на одном из
 * следующих файлов (`VITEST_BROWSER_CONNECTION_CLOSED`).
 *
 * Журнал колонок (`ComponentPage.vue`) печатает события с аргументами —
 * экземплярами ядра и плагинов. Консоль страницы держит залогированное, пока к
 * ней подключён протокол DevTools, а в прогон она не пересылается
 * (`disableConsoleIntercept` в `vitest.browser.config.ts`). Поэтому на время
 * теста журнал заглушён, а после теста шпион снят: вызовы, накопленные в нём,
 * держали бы те же экземпляры. Снимается шпион после стенда — `onTestFinished`
 * идёт за хуками `afterEach`, где стенд снимает `cleanup`.
 */

import { onTestFinished, vi } from 'vitest'
import App from '../src/App.vue'
import { router } from '../src/router'
import { render } from './render'

/** Монтирует стенд на текущий тест; после теста он снят, узел убран. */
export function renderStand(): void {
	const silent = vi.spyOn(console, 'log').mockImplementation(() => {})

	render(App, { plugins: [router] })
	onTestFinished(() => silent.mockRestore())
}
