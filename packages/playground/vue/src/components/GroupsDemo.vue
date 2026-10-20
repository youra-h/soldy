<script setup lang="ts">
import {
	GROUPED_ITEMS,
	PRODUCE_GROUPS,
	PRODUCE_ITEMS,
	previewProps,
	produceGroupOf,
	type IPreviewHost,
	type TComponentEntry,
	type TPreviewEventSink,
} from '@soldy-ui/playground-shared'
import PreviewStage from './PreviewStage.vue'
import CodeView from './CodeView.vue'

/**
 * Блок групп коллекции — в свойствах коллекции, у коллекций с группами (Menu,
 * ListBox, Select: `hasGroups`). Строки у группировки нет: ключ группы —
 * функция, а группы — список записей, и полем их не набрать. Поэтому блок
 * показывает группы на своём составе (`GROUPED_ITEMS`), двумя путями рядом:
 * метка группы в данных (`_.group`) и функция `groupBy` над тем же составом
 * без меток. Порядок и подписи групп — `groups` в обеих колонках, и колонки
 * рисуют одно и то же.
 *
 * Состав блок отдаёт данными (`items`): элементы разметкой превью хоста
 * заменили бы данные, а группы компонент рисует из них. Код под колонкой —
 * генератора хоста, как у строки: проп колонки и её состав пресетом.
 */
const props = defineProps<{
	entry: TComponentEntry
	host: IPreviewHost
	sink: (column: 'props' | 'instance') => TPreviewEventSink
}>()

/** Метка группы в отметках элемента: состав с `_.group` и подписи групп. */
const marked = { ...previewProps(props.entry.id), items: GROUPED_ITEMS, groups: PRODUCE_GROUPS }

/** Ключ группы считает функция: состав без меток, `groupBy` и те же подписи. */
const counted = {
	...previewProps(props.entry.id),
	items: PRODUCE_ITEMS,
	groupBy: produceGroupOf,
	groups: PRODUCE_GROUPS,
}

/** События обеих колонок — пропсами: экземпляра снаружи у блока нет. */
const groupsSink = props.sink('props')
</script>

<template>
	<section class="pg-demo">
		<div class="pg-demo__head">
			<code class="pg-demo__name">groups</code>
			<p class="pg-demo__lead">
				Группы элементов: метка группы в данных (<code>_: { group }</code>) или функция
				<code>groupBy</code>, порядок и подписи — <code>groups</code>. Группу рисует часть
				<code>Group</code> с подписью, элементы без группы — последними; между группами —
				разделитель, если его просит <code>groupSeparators</code> (у Menu — по умолчанию, у
				ListBox и Select — нет). Стрелки ходят в том же порядке, что элементы стоят на
				экране
			</p>
		</div>

		<div class="pg-prop__columns">
			<div class="pg-col">
				<div class="pg-col__head">Метка в данных</div>
				<div class="pg-col__stage">
					<PreviewStage
						:host="host"
						:component="entry.id"
						:bind="marked"
						:sink="groupsSink"
					/>
				</div>
				<CodeView
					v-if="host.snippets"
					:name="`${entry.label}-groups`"
					:code="
						host.snippets.propSnippet(entry, 'groups', PRODUCE_GROUPS, {
							items: GROUPED_ITEMS,
						})
					"
					:extension="host.snippets.extension"
				/>
			</div>

			<div class="pg-col">
				<div class="pg-col__head">groupBy</div>
				<div class="pg-col__stage">
					<PreviewStage
						:host="host"
						:component="entry.id"
						:bind="counted"
						:sink="groupsSink"
					/>
				</div>
				<CodeView
					v-if="host.snippets"
					:name="`${entry.label}-groupBy`"
					:code="
						host.snippets.propSnippet(entry, 'groupBy', produceGroupOf, {
							items: PRODUCE_ITEMS,
							groups: PRODUCE_GROUPS,
						})
					"
					:extension="host.snippets.extension"
				/>
			</div>
		</div>
	</section>
</template>
