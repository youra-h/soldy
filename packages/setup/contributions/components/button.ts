import type { IContribution } from '@soldy/accessor'
import { defineType } from '../defineType'

/**
 * Слоты Button. Тип-зеркало объявления `slots` ниже — меняются синхронно
 * (расхождение ловит conformance-тест).
 *
 * Объект у каждого слота — это его **scope**, то есть что компонент передаёт
 * внутрь. Не тип содержимого: положить в любой слот можно что угодно.
 * `default: { text: string }` читается как «слот получает переменную text»,
 * а не «в слот кладётся строка».
 *
 * Живёт здесь, а не в core: у ядра понятия слота нет вообще, оно ничего
 * не рендерит.
 */
export type TButtonSlots = {
	leading: {}
	default: { text: string }
	trailing: {}
}

export const ButtonContribution = (): IContribution => ({
	props: {
		view: { type: String, triggers: ['change:view'] },
	},
	slots: {
		leading: { description: 'Перед текстом' },
		default: {
			// Компонент отдаёт наружу свой text, чтобы содержимое могло его
			// использовать. Содержимое при этом любое — хоть таблица.
			scope: { text: defineType<string>(String) },
			description: 'Содержимое кнопки. Задано — переопределяет проп text',
		},
		trailing: { description: 'После текста' },
	},
})
