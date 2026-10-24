/**
 * Дескриптор строки элемента коллекции (TItemRow).
 *
 * Деталь разметки ListBox.Item, опции Select, пунктов меню и тега: кнопка,
 * чьи роль и остановку Tab пишет набор `aria` элемента на том же узле, а не
 * она сама. Пропсы, плагины и разметка — Button: наследует `ButtonDescriptor`
 * и повторяет его слоты (`BUTTON_SLOTS`), меняется только класс.
 *
 * Экземпляр создаёт монтирование детали, как у любого компонента без `ctrl`,
 * и отпускает размонтирование: строка живёт столько же, сколько её разметка,
 * а не столько, сколько элемент в коллекции. Под окном `Virtual` строк
 * столько, сколько показано.
 */

import { defineComponent, defineDescriptor } from '../../../protected/define'
import { TItemRow } from '@soldy-ui/core'
import { BUTTON_SLOTS, ButtonDescriptor } from './button.descriptor'

export const ItemRowDescriptor = defineDescriptor(() =>
	defineComponent({
		ctor: TItemRow,

		extends: ButtonDescriptor(),

		contribution: {
			slots: BUTTON_SLOTS,
		},
	}),
)
