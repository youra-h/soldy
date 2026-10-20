/**
 * Дескриптор Textarea (TTextarea) — многострочное поле семьи Input.
 *
 * Наследует InputControlDescriptor (readonly, required, id, value, name,
 * disabled, focused, size, variant, наборы, плагины element/ready/action/aria)
 * и добавляет плейсхолдер, высоту в строках, авторост с потолком, предел
 * символов, счётчик и его набор + плагины: текст счётчика от локали, связка
 * поля со счётчиком, ввод текста из поля и авторост. Слотов нет: кнопки
 * очистки и боковых слотов Input у поля нет, а разметка вокруг — поле формы
 * `Field`.
 */

import { defineComponent, defineDescriptor } from '../../../protected/define'
import { TTextarea } from '@soldy-ui/core'
import {
	InputPluginDescriptor,
	TextareaAutoresizePluginDescriptor,
	TextareaIdsPluginDescriptor,
	TextareaNamesPluginDescriptor,
} from '../plugins'
import { InputControlDescriptor } from './input-control.descriptor'

export const TextareaDescriptor = defineDescriptor(() =>
	defineComponent({
		ctor: TTextarea,

		extends: InputControlDescriptor(),

		contribution: {
			props: {
				/**
				 * Значение переобъявлено типом: текст поля — строка. Триггер
				 * остаётся у ValueControl.
				 */
				value: { type: String },
				placeholder: { type: String, triggers: ['change:placeholder'] },
				/** Высота в строках — нативный `rows`; с авторостом — наименьшая */
				rows: { type: Number, triggers: ['change:rows'] },
				/** Потолок автороста в строках; `0` — потолка нет */
				maxRows: { type: Number, triggers: ['change:maxRows'] },
				/**
				 * Предел символов — нативный `maxlength`. Имя — как у атрибута
				 * HTML, как `readonly`: своё имя у поля только у того, чего у
				 * нативного нет (`maxRows`)
				 */
				maxlength: { type: Number, triggers: ['change:maxlength'] },
				/** Высота по содержимому — её ведёт плагин автороста */
				autoresize: { type: Boolean, triggers: ['change:autoresize'] },
				/** Счётчик символов под полем; текст — выход `names_counter` */
				counter: { type: Boolean, triggers: ['change:counter'] },
				/**
				 * Набор счётчика — разметки внутри поля без своего экземпляра.
				 * `id` в него пишет `TTextareaIdsPlugin`, ссылку поля на счётчик —
				 * `TAriaPlugin` поля
				 */
				counterAria: { type: Object, protected: true, triggers: ['change:counterAria'] },
			},
		},

		plugins: [
			// Текст счётчика от локали — с первой отрисовки
			TextareaNamesPluginDescriptor,
			// `id` счётчика и ссылка поля на него — с первой отрисовки. Ссылку
			// пишет `TAriaPlugin` поля: он из InputControlDescriptor и стоит
			// в наборе раньше
			TextareaIdsPluginDescriptor,
			InputPluginDescriptor,
			TextareaAutoresizePluginDescriptor,
		],
	}),
)
