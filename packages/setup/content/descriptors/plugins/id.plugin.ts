/**
 * Определение TIdPlugin (без namespace) — `id`, который приложение задаёт
 * узлу, на который ссылаются по `id`: полю формы и строке элемента, на которую
 * ссылается сама библиотека.
 *
 * Namespace нет, поэтому проп называется `id`, как атрибут HTML, а не
 * `<namespace>_id`. Пишет его обмен всё равно плагину: свойство идёт к
 * участнику, который его объявил, а namespace лишь даёт префикс имени. Имя
 * без префикса не должно совпасть со свойством ядра — у компонентов, где
 * плагин стоит, своего `id` у экземпляра нет; совпадение дескриптор ловит при
 * сборке: полное имя пропа в составе одно (`reportDuplicateNames`).
 *
 * Событий наружу плагин не публикует: без namespace его `create` стал бы на
 * поверхности компонента просто `create`, а `change:id` уходит наружу
 * триггером пропа.
 */

import { definePlugin } from '../../../protected/define'
import { TIdPlugin } from '@soldy-ui/plugins'

export const IdPluginDescriptor = definePlugin({
	ctor: TIdPlugin,
	contribution: {
		props: {
			id: { type: String, triggers: ['change:id'] },
		},
	},
})
