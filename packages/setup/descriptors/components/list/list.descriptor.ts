/**
 * Дескриптор List (TList).
 *
 * Headless-модель списка (без визуальной части): наследует ControlDescriptor
 * и добавляет maxRows, autoWidth, wordWrap, scrollBehavior.
 */

import { defineComponent } from '../../base'
import { TList } from '@soldy/core'
import { ListContribution } from '../../../contributions'
import { ControlDescriptor } from '../control.descriptor'

export const ListDescriptor = () =>
	defineComponent({
		ctor: TList,

		extends: ControlDescriptor(),

		contribution: ListContribution(),
	})
