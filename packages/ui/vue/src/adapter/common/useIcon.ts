import { defineComponent, h, markRaw, type Component } from 'vue'
import { getIcon } from '@soldy-ui/setup'

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
 *
 * Компонент на роль один на модуль, как `roleIcon` у React: роль читается на
 * отрисовке, и определению нечего помнить о вызове. Новое определение на
 * каждый вызов умножалось бы на экземпляры — у чекбоксов таблицы на 5000
 * строк это 10 000 одинаковых компонентов.
 */
const icons = new Map<string, Component>()

export function useIcon(role: string): Component {
	const known = icons.get(role)

	if (known) return known

	const icon = markRaw(
		defineComponent({
			name: `Icon_${role}`,
			render() {
				const source = getIcon(role)

				return h('svg', {
					viewBox: source.viewBox,
					innerHTML: source.body,
				})
			},
		}),
	)

	icons.set(role, icon)

	return icon
}
