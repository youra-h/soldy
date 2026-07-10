<script lang="ts">
import { type IFrameProps, type IFrame, TFrame } from '@soldy/core'
import { useInstance } from '../../composables/useInstance'
import { useBundle } from '../../composables/useBundle'
import { useElementBinding } from '../../composables/useElementBinding'
import { useInstanceBinding } from '../../composables/useInstanceBinding'
import BaseFrame, { syncFrame } from './base.component'
import { createFrameBundle } from '@soldy/plugins'
import type { TBaseComponentProps } from '../component'

export default {
	name: '_Frame',
	extends: BaseFrame,
	setup(props: TBaseComponentProps<IFrameProps, IFrame>, { emit }) {
		const ctrl = useInstance(TFrame, props)

		// Инициализация плагинов
		const plugins = useBundle(createFrameBundle, props?.plugins)

		// Привязка инстанса к плагинам
		useInstanceBinding(plugins, ctrl)
		// Привязка элемента к плагинам
		const rootRef = useElementBinding(plugins)

		const { visible, rendered, x, y, width, height, styles, target } = syncFrame({
			props,
			ctrl,
			plugins,
			emit,
		})

		return {
			ctrl,
			plugins,
			rootRef,
			styles,
			visible,
			rendered,
			x,
			y,
			width,
			height,
			target,
		}
	},
}
</script>

<template>
	<teleport :to="target">
		<div ref="rootRef" v-show="visible" v-if="rendered" :style="styles" class="s-frame">
			<slot />
		</div>
	</teleport>
</template>
