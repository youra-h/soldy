/**
 * Дескриптор Frame (TFrame).
 *
 * Наследует ComponentViewDescriptor: Frame — визуальный компонент, ему нужны
 * rendered/visible/present, tag, classes и плагины element/ready. Раньше он
 * наследовал ComponentDescriptor и дублировал эти плагины, потому что
 * ComponentViewDescriptor ошибочно считался приносящим size/variant — те
 * объявлены ниже по цепочке, в StylableContribution.
 *
 * Добавляет x, y, width, height, position, target, zIndex + frame-layout плагин.
 */

import { defineComponent } from '../base'
import { TFrame } from '@soldy/core'
import type { IFrameProps, TFrameEvents } from '@soldy/core'
import { FrameLayoutPluginDescriptor, AnchorPluginDescriptor, AriaPluginDescriptor } from '../plugins'
import { FrameContribution } from '../../contributions'
import { ComponentViewDescriptor } from './component-view.descriptor'

export const FrameDescriptor = () =>
	defineComponent<IFrameProps, TFrameEvents>()({
		ctor: TFrame,

		extends: ComponentViewDescriptor(),

		contribution: FrameContribution(),

		plugins: [FrameLayoutPluginDescriptor(), AnchorPluginDescriptor(), AriaPluginDescriptor()],
	})
