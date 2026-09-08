import { defineComponent, h, markRaw, type Component } from 'vue'
import { getIcon } from '@soldy/setup'

/**
 * Компонент иконки по роли из реестра.
 *
 * Иконка приходит данными (`{ viewBox, body }`), а разметку строит адаптер —
 * поэтому здесь `h()`, а не `template`. Разница не косметическая: `template`
 * требует рантайм-компилятор Vue, из-за чего в конфиге стоял алиас на полный
 * билд (`vue/dist/vue.esm-bundler.js`). То есть иконки навязывали лишний вес
 * каждому приложению и ломались при CSP без `unsafe-eval`.
 *
 * `innerHTML` вместо разбора `body` на узлы: содержимое иконки произвольно —
 * группы, маски, несколько путей. Источник доверенный (пакет из зависимостей),
 * пользовательский ввод сюда не попадает.
 *
 * Роль резолвится **на отрисовке**, а не при вызове: `setIcons()` может быть
 * вызван после того, как компонент уже создан.
 */
export function useIcon(role: string): Component {
	return markRaw(
		defineComponent({
			name: `Icon_${role}`,
			render() {
				const icon = getIcon(role)

				return h('svg', {
					viewBox: icon.viewBox,
					innerHTML: icon.body,
				})
			},
		}),
	)
}
