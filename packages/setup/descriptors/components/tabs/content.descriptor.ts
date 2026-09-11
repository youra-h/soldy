/**
 * Дескрипторы панели таба (`TabsContent`).
 *
 * Две штуки — как у элемента: собственный (props панели) и коллекционный
 * (активность и ARIA-связка, выводятся фасадом). Смешивать нельзя: core
 * отвечает за props и events, коллекционная часть — за членство в коллекции.
 */

import { defineComponent } from '../../base'
import { TTabsContent, TTabsContentCollectionFacade } from '@soldy/core'
import type { ITabsContentProps, TTabsContentEvents } from '@soldy/core'
import {
	TabsContentContribution,
	TabsCollectionContentContribution,
	type TTabsContentSlots,
} from '../../../contributions'
import { ComponentViewDescriptor } from '../component-view.descriptor'
import { TabsContentWarnPluginDescriptor } from '../../plugins'

export const TabsContentDescriptor = () =>
	defineComponent<ITabsContentProps, TTabsContentEvents, TTabsContentSlots>()({
		ctor: TTabsContent,

		extends: ComponentViewDescriptor(),

		contribution: TabsContentContribution(),

		plugins: [TabsContentWarnPluginDescriptor()],
	})

export const TabsCollectionContentDescriptor = () =>
	defineComponent({
		ctor: TTabsContentCollectionFacade,

		contribution: TabsCollectionContentContribution(),
	})
