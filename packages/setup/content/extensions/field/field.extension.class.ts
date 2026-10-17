/**
 * TFieldExtension — проводка поля формы `Field`: связка контролу внутри.
 *
 * Поле опускает по лифту (`FIELD_ELEVATOR`) себя и свой плагин связок
 * (`TFieldIdsPlugin`), а контрол внутри подхватывает их своим расширением
 * (`TFieldControlExtension`) — при сборке, поэтому ошибка, `id` поля и ссылки
 * на части есть уже в первой и серверной отрисовке. Ни регистрации, ни
 * подписок у поля нет, поэтому фаз контекста оно не ждёт: их ведёт контрол.
 *
 * Плагина связок у набора нет (чужой набор без него) — опускается пустая
 * связка: контрол ведёт себя так, будто поля нет.
 *
 * Использование:
 *   adapter.use(TFieldExtension, { elevator: VueElevatorFactory })
 */

import type { IField } from '@soldy-ui/core'
import { TFieldIdsPlugin } from '@soldy-ui/plugins'
import type { TInstanceContext } from '../../../protected/adapter/context'
import { FIELD_ELEVATOR } from './keys'
import type { IFieldExtensionOptions } from './types'

export class TFieldExtension {
	constructor(context: TInstanceContext<IField>, options: IFieldExtensionOptions) {
		const ids = context.bundle?.get(TFieldIdsPlugin)

		options.elevator(FIELD_ELEVATOR).down(ids ? { field: context.instance, ids } : null)
	}
}
