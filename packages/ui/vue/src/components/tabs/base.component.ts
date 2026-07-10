import type { PropType, Ref } from 'vue'
import { watch } from 'vue'
import { useSyncProps } from '../../composables/useSyncProps'
import {
	type ITabs,
	type ITabsProps,
	TTabs,
	type TTabsOrientation,
	type TTabsAlignment,
	type TTabsPosition,
	type TTabsView,
	type ITabItem,
} from '@soldy/core'
import {
	BaseControl,
	emitsControl,
	propsControl,
	syncControl,
	type IControlState,
} from '../control'
import {
	emitsActivatableCollection,
	syncActivatableCollection,
	propsActivatableCollection,
	type IActivatableCollectionState,
} from '../collection/activable'
import type { TEmits, TProps, ISyncComponentOptions } from '../../types'
import { useInheritProps } from '../../composables/useInheritProps'

export const emitsTabs: TEmits = [
	...emitsControl,
	...emitsActivatableCollection,
	'change:orientation',
	'update:orientation',
	'change:alignment',
	'update:alignment',
	'change:position',
	'update:position',
	'change:view',
	'update:view',
	'change:closable',
	'update:closable',
	'item:close',
	'item:closable',
	'item:disabled',
	'item:text',
	'item:rendered',
	'item:visible',
	'item:present',
] as const

export const propsTabs: TProps = {
	...useInheritProps(propsControl, TTabs),
	...propsActivatableCollection,
	orientation: {
		type: String as PropType<TTabsOrientation>,
		default: TTabs.defaultValues.orientation,
	},
	alignment: {
		type: String as PropType<TTabsAlignment>,
		default: TTabs.defaultValues.alignment,
	},
	position: {
		type: String as PropType<TTabsPosition>,
		default: TTabs.defaultValues.position,
	},
	view: {
		type: String as PropType<TTabsView>,
		default: TTabs.defaultValues.view,
	},
	closable: {
		type: Boolean as PropType<ITabsProps['closable']>,
		default: TTabs.defaultValues.closable,
	},
}

export default {
	name: 'BaseTabs',
	extends: BaseControl,
	emits: emitsTabs,
	props: propsTabs,
}

export interface ITabsState extends IControlState, IActivatableCollectionState<ITabItem> {
	orientation: Ref<TTabsOrientation>
	alignment: Ref<TTabsAlignment>
	position: Ref<TTabsPosition>
	view: Ref<TTabsView>
	closable: Ref<boolean>
}

/**
 * Синхронизация props и событий для Tabs
 */
export function syncTabs(
	options: ISyncComponentOptions<ITabsProps<ITabItem>, ITabs>,
): ITabsState {
	const synPropsControl = syncControl(options)

	const { props, ctrl, emit, plugins } = options

	// Синхронизируем коллекцию (items, count, activeItem)
	const synPropsActivatableCollection = syncActivatableCollection<ITabItem>({
		props,
		ctrl: ctrl.collection,
		emit,
		plugins,
	})

	// Пробрасываем события core-инстанса наружу (Vue events)
	ctrl.events.on('change:orientation', (value: TTabsOrientation) => {
		emit?.('change:orientation', value)
		emit?.('update:orientation', value)
	})

	ctrl.events.on('change:alignment', (value: TTabsAlignment) => {
		emit?.('change:alignment', value)
		emit?.('update:alignment', value)
	})

	ctrl.events.on('change:position', (value: TTabsPosition) => {
		emit?.('change:position', value)
		emit?.('update:position', value)
	})

	ctrl.events.on('change:view', (value: TTabsView) => {
		emit?.('change:view', value)
		emit?.('update:view', value)
	})

	ctrl.events.on('change:closable', (value: boolean) => {
		emit?.('change:closable', value)
		emit?.('update:closable', value)
	})

	ctrl.events.on('item:close', (item: ITabItem) => {
		emit?.('item:close', item)
	})

	ctrl.events.on('item:closable', (item: ITabItem, value: boolean) => {
		emit?.('item:closable', item, value)
	})

	ctrl.events.on('item:disabled', (item: ITabItem, value: boolean) => {
		emit?.('item:disabled', item, value)
	})

	ctrl.events.on('item:text', (item: ITabItem, value: string) => {
		emit?.('item:text', item, value)
	})

	ctrl.events.on('item:rendered', (item: ITabItem, value: boolean) => {
		emit?.('item:rendered', item, value)
	})

	ctrl.events.on('item:visible', (item: ITabItem, value: boolean) => {
		emit?.('item:visible', item, value)
	})

	ctrl.events.on('item:present', (item: ITabItem, value: boolean) => {
		emit?.('item:present', item, value)
	})

	// Watch props
	watch<TTabsOrientation | undefined>(
		() => props.orientation,
		(value) => {
			if (value !== undefined && value !== ctrl.orientation) {
				ctrl.orientation = value
			}
		},
	)

	watch<TTabsAlignment | undefined>(
		() => props.alignment,
		(value) => {
			if (value !== undefined && value !== ctrl.alignment) {
				ctrl.alignment = value
			}
		},
	)

	watch<TTabsPosition | undefined>(
		() => props.position,
		(value) => {
			if (value !== undefined && value !== ctrl.position) {
				ctrl.position = value
			}
		},
	)

	watch<TTabsView | undefined>(
		() => props.view,
		(value) => {
			if (value !== undefined && value !== ctrl.view) {
				ctrl.view = value
			}
		},
	)

	watch(
		() => props.closable,
		(value) => {
			if (value !== ctrl.closable) {
				ctrl.closable = !!value
			}
		},
	)

	// Возвращаем объединённое состояние (control + collection + локальные props)
	return {
		...synPropsControl,
		...synPropsActivatableCollection,
		...useSyncProps(ctrl.events as any, {
			orientation: () => ctrl.orientation,
			alignment: () => ctrl.alignment,
			position: () => ctrl.position,
			view: () => ctrl.view,
			closable: () => ctrl.closable,
		}),
	}
}
