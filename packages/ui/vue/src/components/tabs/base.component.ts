import type { PropType, Ref } from 'vue'
import { track } from '@soldy/core'
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
	'changeOrientation',
	'update:orientation',
	'changeAlignment',
	'update:alignment',
	'changePosition',
	'update:position',
	'changeView',
	'update:view',
	'changeClosable',
	'update:closable',
	'itemClose',
	'itemClosable',
	'itemDisabled',
	'itemText',
	'itemRendered',
	'itemVisible',
	'itemPresent',
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

	const { props, instance, emit, plugins } = options

	// Синхронизируем коллекцию (items, count, activeItem)
	const synPropsActivatableCollection = syncActivatableCollection<ITabItem>({
		props,
		instance: instance.collection,
		emit,
		plugins,
	})

	// Пробрасываем события core-инстанса наружу (Vue events)
	instance.events.on('changeOrientation', (value: TTabsOrientation) => {
		emit?.('changeOrientation', value)
		emit?.('update:orientation', value)
	})

	instance.events.on('changeAlignment', (value: TTabsAlignment) => {
		emit?.('changeAlignment', value)
		emit?.('update:alignment', value)
	})

	instance.events.on('changePosition', (value: TTabsPosition) => {
		emit?.('changePosition', value)
		emit?.('update:position', value)
	})

	instance.events.on('changeView', (value: TTabsView) => {
		emit?.('changeView', value)
		emit?.('update:view', value)
	})

	instance.events.on('changeClosable', (value: boolean) => {
		emit?.('changeClosable', value)
		emit?.('update:closable', value)
	})

	instance.events.on('itemClose', (item: ITabItem) => {
		emit?.('itemClose', item)
	})

	instance.events.on('itemClosable', (item: ITabItem, value: boolean) => {
		emit?.('itemClosable', item, value)
	})

	instance.events.on('itemDisabled', (item: ITabItem, value: boolean) => {
		emit?.('itemDisabled', item, value)
	})

	instance.events.on('itemText', (item: ITabItem, value: string) => {
		emit?.('itemText', item, value)
	})

	instance.events.on('itemRendered', (item: ITabItem, value: boolean) => {
		emit?.('itemRendered', item, value)
	})

	instance.events.on('itemVisible', (item: ITabItem, value: boolean) => {
		emit?.('itemVisible', item, value)
	})

	instance.events.on('itemPresent', (item: ITabItem, value: boolean) => {
		emit?.('itemPresent', item, value)
	})

	// Watch props
	track(props, 'orientation', (value) => {
		if (value !== undefined && value !== instance.orientation) {
			instance.orientation = value
		}
	})

	track(props, 'alignment', (value) => {
		if (value !== undefined && value !== instance.alignment) {
			instance.alignment = value
		}
	})

	track(props, 'position', (value) => {
		if (value !== undefined && value !== instance.position) {
			instance.position = value
		}
	})

	track(props, 'view', (value) => {
		if (value !== undefined && value !== instance.view) {
			instance.view = value
		}
	})

	track(props, 'closable', (value) => {
		if (value !== instance.closable) {
			instance.closable = !!value
		}
	})

	// Возвращаем объединённое состояние (control + collection + локальные props)
	return {
		...synPropsControl,
		...synPropsActivatableCollection,
		...useSyncProps(instance.events as any, {
			orientation: () => instance.orientation,
			alignment: () => instance.alignment,
			position: () => instance.position,
			view: () => instance.view,
			closable: () => instance.closable,
		}),
	}
}
