<script setup lang="ts">
import { onUnmounted } from 'vue'
import {
	createInstance,
	previewProps,
	type IPreviewHost,
	type TComponentEntry,
	type TPreviewEventSink,
} from '@soldy-ui/playground-shared'
import PreviewColumns from './PreviewColumns.vue'

/**
 * Сцена компонента без строк свойств — те же две колонки, что у строки
 * (`PreviewColumns`), без поля и кода: править на ней нечего.
 *
 * У компонента бывает поведение без пропов — у DragAndDrop это перестановка
 * коллекций внутри, — и страница без строк его не показывала вовсе. Колонки —
 * как у строки: пропсами превью и над экземпляром ядра, который сцена создаёт
 * сама (`createInstance`) и уничтожает, когда уходит. События обеих колонок —
 * в консоль, с пометкой колонки.
 */
const props = defineProps<{
	entry: TComponentEntry
	host: IPreviewHost
	sink: (column: 'props' | 'instance') => TPreviewEventSink
}>()

/** Экземпляр ядра правой колонки — один на сцену, как у строки. */
const instance = createInstance(props.entry)

onUnmounted(() => instance.destroy?.())

const preview = previewProps(props.entry.id)

const propBind = preview
const instanceBind = { ...preview, ctrl: instance }

const propSink = props.sink('props')
const instanceSink = props.sink('instance')
</script>

<template>
	<section class="pg-scene">
		<PreviewColumns
			:host="host"
			:component="entry.id"
			:prop-bind="propBind"
			:instance-bind="instanceBind"
			:prop-sink="propSink"
			:instance-sink="instanceSink"
		/>
	</section>
</template>
