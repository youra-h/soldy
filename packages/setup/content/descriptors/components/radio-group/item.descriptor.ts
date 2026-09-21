/**
 * Дескриптор RadioGroupItem (TRadioGroupItem).
 *
 * Наследует `ValueControlDescriptor` (value, name, disabled, focused, size,
 * variant, ...) и добавляет `view`. Текста у радио нет — это голый контрол,
 * как CheckBox: подпись кладут слотом, а без неё имя дают `aria_label` или
 * `aria_labelledBy`.
 *
 * `size`, `variant`, `view` и `name` раздаёт группа — и только она, поэтому
 * входами разметки они у радио не объявлены: `size` и `variant` сняты общим
 * фрагментом, `view` объявлен защищённым сразу, `name` — переобъявлением
 * унаследованного (см. `TComponentDescriptor`, «переобъявление пропа»). Своё
 * `name` вдобавок ломало браузерную группировку радио: стрелки по кругу и
 * одна остановка Tab работают по общему имени.
 */

import { defineComponent, defineDescriptor } from '../../../../protected/define'
import { TRadioGroupItem } from '@soldy/core'
import { ValueControlDescriptor } from '../value-control.descriptor'
import { OWNER_STYLE_PROPS } from '../stylable.descriptor'

export const RadioGroupItemDescriptor = defineDescriptor(() =>
	defineComponent({
		ctor: TRadioGroupItem,

		extends: ValueControlDescriptor(),

		contribution: {
			// Слот один — подпись: она лежит внутри корня-`label`, поэтому клик по
			// ней выбирает радио, а текст становится его доступным именем
			slots: {
				default: { description: 'Подпись радио' },
			},
			props: {
				...OWNER_STYLE_PROPS,
				view: { type: String, protected: true, triggers: ['change:view'] },
				// Имя в форме — общее на группу, иначе браузер не считает радио одной группой
				name: { protected: true },
			},
		},
	}),
)
