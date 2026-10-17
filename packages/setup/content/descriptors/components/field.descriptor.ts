/**
 * Дескриптор Field (TField) — поле формы: подпись, контрол, подсказка и
 * ошибка.
 *
 * Наследует StylableDescriptor (rendered, visible, tag, size, variant, наборы)
 * и добавляет тексты частей, ошибку поля, сторону подписи, наборы частей и
 * плагин связок. Своих состояний контрола у поля нет — ни `disabled`, ни
 * `required`: они у контрола, как у подписи `Label`.
 *
 * Части — разметка поля, а не компоненты: потребитель их не размещает и
 * пропсов им не задаёт (AGENTS.md, «Часть или слот»). Текст части — проп с её
 * именем, своя разметка вместо текста — слот `<часть>-content`: имя слота не
 * совпадает с именем пропа, как `text`/`content` у `Label`. Контрол — слот
 * `default`.
 *
 * С контролом поле связывает проводка адаптера (`TFieldExtension` у поля,
 * `TFieldControlExtension` у контрола): ошибку, `id` поля и ссылки на части
 * контрол берёт при сборке, о себе сообщает при приёме.
 */

import { defineComponent, defineDescriptor } from '../../../protected/define'
import { TField } from '@soldy-ui/core'
import { FieldIdsPluginDescriptor } from '../plugins'
import { StylableDescriptor } from './stylable.descriptor'

export const FieldDescriptor = defineDescriptor(() =>
	defineComponent({
		ctor: TField,

		extends: StylableDescriptor(),

		contribution: {
			slots: {
				default: {
					description:
						'Контрол: Input, Select, CheckBox, Switch, DateInput, DatePicker, RadioGroup, Rating или Label с контролом',
				},
				'label-content': {
					description:
						'Своя разметка подписи — только строчная. Рисуется, пока задан label',
				},
				'helper-content': {
					description:
						'Своя разметка подсказки. Рисуется, пока задан helper и нет ошибки',
				},
				'error-content': {
					description: 'Своя разметка ошибки. Рисуется при invalid, пока задан error',
				},
			},
			props: {
				label: { type: String, triggers: ['change:label'] },
				helper: { type: String, triggers: ['change:helper'] },
				error: { type: String, triggers: ['change:error'] },
				/**
				 * Ошибка поля: её видно, и контрол помечен ошибкой. Проверку и
				 * момент, когда её показывать, решает приложение.
				 */
				invalid: { type: Boolean, triggers: ['change:invalid'] },
				position: { type: String, triggers: ['change:position'] },
				/** Подсказку видно: текст есть, а ошибки не видно — она встаёт на её место. */
				helperRendered: {
					type: Boolean,
					protected: true,
					triggers: ['change:helper', 'change:error', 'change:invalid'],
				},
				/** Ошибку видно: поле невалидно, и текст ошибки есть. */
				errorRendered: {
					type: Boolean,
					protected: true,
					triggers: ['change:error', 'change:invalid'],
				},
				/**
				 * Наборы частей — разметки без экземпляра, поэтому наборы поля, как
				 * `titleAria` у окна. `id` частей и `for` подписи пишет плагин
				 * связок.
				 */
				labelAria: { type: Object, protected: true, triggers: ['change:labelAria'] },
				helperAria: { type: Object, protected: true, triggers: ['change:helperAria'] },
				errorAria: { type: Object, protected: true, triggers: ['change:errorAria'] },
			},
		},

		// `id` частей, `for` подписи и ссылки контрола на видимые части — от
		// монтирования, с первой отрисовки
		plugins: [FieldIdsPluginDescriptor],
	}),
)
