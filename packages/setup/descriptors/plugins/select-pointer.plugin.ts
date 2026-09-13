import { definePlugin } from '../base'
import { TSelectPointerPlugin } from '@soldy/plugins'
import type { TSelectPointerPluginEvents } from '@soldy/plugins'
import { SelectPointerContribution } from '../../contributions'

/**
 * Клик по полю Select. Select-only тумблит панель кликом по всему полю,
 * editable — только кликом по стрелке; выбор поведения переключается по
 * `change:editable`, см. `TSelectPointerPlugin`.
 */
export const SelectPointerPluginDescriptor = () =>
	definePlugin<'pointer', TSelectPointerPluginEvents>({
		ctor: TSelectPointerPlugin,
		namespace: 'pointer',
		contribution: SelectPointerContribution(),
	})
