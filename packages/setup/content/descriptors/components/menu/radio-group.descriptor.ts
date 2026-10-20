/**
 * Дескриптор группы переключателей меню (TMenuRadioGroup) — переключатели под общей подписью.
 *
 * Подпись, её набор и плагин связок — от `MenuGroupDescriptor`: группа
 * переключателей — та же группа меню. Своё — значение: `value` отмеченного
 * переключателя, в обе стороны (`v-model:value` у Vue). Слот пунктов объявлен
 * заново: слоты не наследуются.
 *
 * Группу её переключателям опускает проводка (`TMenuRadioGroupExtension`), а
 * правило «в группе отмечен один» держит коллекция меню.
 */

import { defineComponent, defineDescriptor } from '../../../../protected/define'
import { TMenuRadioGroup } from '@soldy-ui/core'
import { MenuGroupDescriptor } from './group.descriptor'

export const MenuRadioGroupDescriptor = defineDescriptor(() =>
	defineComponent({
		ctor: TMenuRadioGroup,

		extends: MenuGroupDescriptor(),

		contribution: {
			props: {
				value: { type: [String, Number], triggers: ['change:value'] },
			},
			slots: {
				default: { description: 'Переключатели группы' },
			},
		},
	}),
)
