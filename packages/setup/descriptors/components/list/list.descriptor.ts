/**
 * Дескриптор List (TList).
 *
 * Headless-модель списка (без визуальной части): наследует
 * `ValueControlDescriptor` и добавляет maxRows, autoWidth, wordWrap,
 * scrollBehavior.
 *
 * Именно `ValueControl`, а не `Control`: у списка есть значение — то, что
 * выбрано. Выбор был всегда, но отдавался наружу списком объектов
 * (`selected: TItem[]`), то есть внутренней моделью коллекции; потребителю
 * нужен ответ в значениях, и он же уходит в форму.
 */

import { defineComponent } from '../../base'
import { TList } from '@soldy/core'
import { ListContribution } from '../../../contributions'
import { ValueControlDescriptor } from '../value-control.descriptor'

export const ListDescriptor = () =>
	defineComponent({
		ctor: TList,

		extends: ValueControlDescriptor(),

		contribution: ListContribution(),
	})
