/**
 * Сервер и браузер в одном процессе спека: серверный рендер Vue и гидратация
 * его разметки.
 */

import { createSSRApp, type VNode } from 'vue'
import { renderToString, type SSRContext } from 'vue/server-renderer'

/** Контейнеры, над которыми прошла гидратация: их убирает `removeContainers`. */
const containers: HTMLElement[] = []

/**
 * Рендер сервера и гидратация той же разметки; предупреждения Vue — наружу.
 *
 * Страница сервера — целиком, с телепортами: панели оверлеев (Frame) Vue
 * рендерит не в разметку приложения, а в `context.teleports`, и серверная
 * страница кладёт их в начало `body`, перед приложением. Гидратация
 * телепорта ищет его содержимое с первого узла цели и запоминает, где
 * остановилась, на самой цели, поэтому `body` у каждого рендера свой.
 */
export async function hydrate(render: () => VNode): Promise<{
	server: HTMLElement
	client: HTMLElement
	warnings: string[]
}> {
	const context: SSRContext = {}
	const html = await renderToString(createSSRApp({ render }), context)
	const server = document.createElement('div')
	const client = document.createElement('div')
	const warnings: string[] = []

	server.innerHTML = html
	client.innerHTML = html
	document.body = document.createElement('body')
	document.body.innerHTML = context.teleports?.body ?? ''
	document.body.append(client)
	containers.push(client)

	const app = createSSRApp({ render })

	app.config.warnHandler = (message) => warnings.push(message)
	app.mount(client)

	return { server, client, warnings }
}

/** После теста: убрать из документа контейнеры гидратации. */
export function removeContainers(): void {
	for (const container of containers.splice(0)) container.remove()
}
