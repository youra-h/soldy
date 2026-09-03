<script setup lang="ts">
import { TCollapse } from '@soldy/core'
import type { TCollapseCollection } from '@soldy/core'
import { Collapse, CollapseItem } from '@soldy/ui-vue'
import type { TComponentSize, TComponentVariant } from '@soldy/core'

type Props = {
	size?: TComponentSize
	variant?: TComponentVariant
}

defineProps<Props>()

const APPEARANCES = ['plain', 'outlined', 'filled'] as const

const collapseInstance = new TCollapse()

function onEngineCreate(engine: TCollapseCollection) {
	const { plain, selection } = engine.extensions

	const sectionA = plain.push({ text: 'Section A', value: 'sA' })
	plain.push({ text: 'Section B', value: 'sB' })
	plain.push({ text: 'Section C', value: 'sC' })

	selection.select(sectionA)
}
</script>

<template>
	<div class="collapse-slots-demo">
		<!-- Views -->
		<div v-for="view in APPEARANCES" :key="view" class="collapse-slots-demo__section">
			<h4 class="collapse-slots-demo__subtitle">{{ view }}</h4>

			<Collapse :view="view" :size="size" :variant="variant" mode="multiple">
				<CollapseItem text="Section 1" value="s1" :selected="true">
					<p>Content for section 1 — {{ view }} view</p>
				</CollapseItem>
				<CollapseItem text="Section 2" value="s2">
					<p>Content for section 2</p>
				</CollapseItem>
				<CollapseItem text="Section 3" value="s3">
					<p>Content for section 3</p>
				</CollapseItem>
			</Collapse>
		</div>

		<!-- Single mode -->
		<div class="collapse-slots-demo__section">
			<h4 class="collapse-slots-demo__subtitle">mode: single</h4>
			<Collapse view="outlined" :size="size" :variant="variant" mode="single">
				<CollapseItem text="Single mode — only one open" value="s1" :selected="true">
					<p>Only one section can be open at a time</p>
				</CollapseItem>
				<CollapseItem text="Section 2" value="s2">
					<p>Opening this will close Section 1</p>
				</CollapseItem>
				<CollapseItem text="Section 3" value="s3">
					<p>Section 3 content</p>
				</CollapseItem>
			</Collapse>
		</div>

		<!-- Arrow placement -->
		<div class="collapse-slots-demo__section">
			<h4 class="collapse-slots-demo__subtitle">Arrow placement</h4>
			<div class="collapse-slots-demo__group">
				<span class="collapse-slots-demo__label">start (default: end)</span>
				<Collapse view="plain" :size="size" :variant="variant" mode="multiple">
					<CollapseItem text="Arrow start" value="s1" arrow-placement="start">
						<p>Arrow is on the left</p>
					</CollapseItem>
					<CollapseItem text="Arrow end" value="s2" arrow-placement="end">
						<p>Arrow is on the right</p>
					</CollapseItem>
				</Collapse>
			</div>
		</div>

		<!-- #item slot — кастомизация через scoped slot -->
		<div class="collapse-slots-demo__section">
			<h4 class="collapse-slots-demo__subtitle">Custom #item slot</h4>
			<Collapse
				:ctrl="collapseInstance"
				@engine:create="onEngineCreate"
				view="outlined"
				:size="size"
				:variant="variant"
				mode="multiple"
			>
				<template #item="{ item }">
					{{ item.text }}
				</template>
			</Collapse>
		</div>

		<!-- Custom leading/trailing slots -->
		<div class="collapse-slots-demo__section">
			<h4 class="collapse-slots-demo__subtitle">Custom leading/trailing slots</h4>
			<Collapse view="outlined" :size="size" :variant="variant" mode="multiple">
				<CollapseItem text="With icon leading" value="s1">
					<template #leading>
						<span class="collapse-slots-demo__badge">⭐</span>
					</template>
					<p>Custom slot leading the text</p>
				</CollapseItem>
				<CollapseItem text="With icon trailing" value="s2">
					<template #trailing>
						<span class="collapse-slots-demo__badge">3</span>
					</template>
					<p>Custom slot trailing the text</p>
				</CollapseItem>
			</Collapse>
		</div>

		<!-- Per-item slots via Collapse: item:value:leading / item:value:header / item:value:trailing -->
		<div class="collapse-slots-demo__section">
			<h4 class="collapse-slots-demo__subtitle">Per-item slots via Collapse</h4>
			<Collapse
				:ctrl="collapseInstance"
				@engine:create="onEngineCreate"
				view="outlined"
				:size="size"
				:variant="variant"
			>
				<template #item:sA:leading>
					<span class="collapse-slots-demo__badge">📂</span>
				</template>
				<template #item:sB:header="{ item }">
					<span class="font-bold">{{ item.text }}</span>
				</template>
				<template #item:sC:trailing>
					<span class="collapse-slots-demo__badge">🔒</span>
				</template>
				<template #panel:sA><p>Content A</p></template>
				<template #panel:sB><p>Content B</p></template>
				<template #panel:sC><p>Content C</p></template>
			</Collapse>
		</div>

		<!-- #item catch-all -->
		<div class="collapse-slots-demo__section">
			<h4 class="collapse-slots-demo__subtitle">Custom #item slot (catch-all)</h4>
			<Collapse
				:ctrl="collapseInstance"
				@engine:create="onEngineCreate"
				view="outlined"
				:size="size"
				:variant="variant"
			>
				<template #item="{ item }">
					<div class="flex items-center gap-2">
						<span>📁</span>
						<span>{{ item.text }}</span>
					</div>
				</template>
				<template #panel:sA><p>Content A</p></template>
				<template #panel:sB><p>Content B</p></template>
				<template #panel:sC><p>Content C</p></template>
			</Collapse>
		</div>
	</div>
</template>

<style lang="scss" scoped>
.collapse-slots-demo {
	display: flex;
	flex-direction: column;
	gap: 2rem;

	&__section {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	&__subtitle {
		font-size: 0.875rem;
		line-height: 1.25rem;
		font-weight: 600;
		color: #4b5563;
		text-transform: uppercase;
		letter-spacing: 0.025em;
	}

	&__group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	&__label {
		font-size: 0.75rem;
		line-height: 1rem;
		color: #9ca3af;
	}

	&__badge {
		padding-left: 0.5rem;
		padding-right: 0.5rem;
		padding-top: 0.125rem;
		padding-bottom: 0.125rem;
		background-color: #f3f4f6;
		color: #6b7280;
		border-radius: 0.25rem;
		font-size: 0.75rem;
		line-height: 1rem;
	}
}
</style>
