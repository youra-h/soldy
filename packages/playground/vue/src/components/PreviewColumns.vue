<script setup lang="ts">
import type { IPreviewHost, TPreviewEventSink } from '@soldy-ui/playground-shared'
import PreviewStage from './PreviewStage.vue'

/**
 * Две колонки превью: компонент пропсами (Component) и над экземпляром ядра
 * (Component Instance).
 *
 * Одни на строку свойства (`PropRow`) и на сцену компонента без строк
 * (`ComponentScene`): что лежит в колонках и куда идут события, решает
 * владелец, колонки только рисуют. Код под сценой колонки — слотом: у строки
 * он есть, у сцены — нет.
 */
defineProps<{
	host: IPreviewHost
	/** Идентификатор компонента в реестре — ключ карты превью хоста. */
	component: string
	/** Пропсы колонки Component. */
	propBind: Readonly<Record<string, unknown>>
	/** Пропсы колонки Component Instance — с экземпляром ядра в `ctrl`. */
	instanceBind: Readonly<Record<string, unknown>>
	propSink: TPreviewEventSink
	instanceSink: TPreviewEventSink
}>()
</script>

<template>
	<!--
		Колонки рисует хост фреймворка (`PreviewStage`), код под ними — тоже он:
		нет генератора у хоста — нет и блоков кода.
	-->
	<div class="pg-prop__columns">
		<div class="pg-col">
			<div class="pg-col__head">Component</div>
			<div class="pg-col__stage">
				<PreviewStage
					:host="host"
					:component="component"
					:bind="propBind"
					:sink="propSink"
				/>
			</div>
			<slot name="prop-code" />
		</div>

		<div class="pg-col">
			<div class="pg-col__head">Component Instance</div>
			<div class="pg-col__stage">
				<PreviewStage
					:host="host"
					:component="component"
					:bind="instanceBind"
					:sink="instanceSink"
				/>
			</div>
			<slot name="instance-code" />
		</div>
	</div>
</template>
