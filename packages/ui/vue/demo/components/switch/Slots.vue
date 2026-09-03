<script setup lang="ts">
import { Switch, Icon, useIconImport } from '@soldy/ui-vue'
import { SIZES, VARIANTS } from '../../common/items'
import type { TComponentSize, TComponentVariant } from '@soldy/core'

type Props = {
	visible?: boolean
	rendered?: boolean
}

const props = defineProps<Props>()

const sizes: TComponentSize[] = SIZES
const variants: TComponentVariant[] = VARIANTS
</script>

<template>
	<div class="sizes-demo">
		<div class="sizes-demo__title">All Sizes & Variants Demo</div>

		<!-- Grid with all sizes and variants (OFF state) -->
		<div class="sizes-demo__subtitle">OFF State</div>
		<div class="sizes-demo__grid">
			<div class="sizes-demo__grid-header">
				<div class="sizes-demo__grid-cell sizes-demo__grid-cell--header">
					Size / Variant
				</div>
				<div
					v-for="variant in variants"
					:key="variant"
					class="sizes-demo__grid-cell sizes-demo__grid-cell--header"
				>
					{{ variant }}
				</div>
			</div>

			<div v-for="size in sizes" :key="size" class="sizes-demo__grid-row">
				<div class="sizes-demo__grid-cell sizes-demo__grid-cell--label">
					{{ size }}
				</div>
				<div v-for="variant in variants" :key="variant" class="sizes-demo__grid-cell">
					<Switch
						:visible="visible"
						:rendered="rendered"
						:size="size"
						:variant="variant"
						:value="false"
					/>
				</div>
			</div>
		</div>

		<!-- Grid with all sizes and variants (ON state) -->
		<div class="sizes-demo__subtitle">ON State</div>
		<div class="sizes-demo__grid">
			<div class="sizes-demo__grid-header">
				<div class="sizes-demo__grid-cell sizes-demo__grid-cell--header">
					Size / Variant
				</div>
				<div
					v-for="variant in variants"
					:key="variant"
					class="sizes-demo__grid-cell sizes-demo__grid-cell--header"
				>
					{{ variant }}
				</div>
			</div>

			<div v-for="size in sizes" :key="size" class="sizes-demo__grid-row">
				<div class="sizes-demo__grid-cell sizes-demo__grid-cell--label">
					{{ size }}
				</div>
				<div v-for="variant in variants" :key="variant" class="sizes-demo__grid-cell">
					<Switch
						:visible="visible"
						:rendered="rendered"
						:size="size"
						:variant="variant"
						:value="true"
					/>
				</div>
			</div>
		</div>

		<!-- Custom icons in slots -->
		<div class="sizes-demo__section">
			<div class="sizes-demo__section-title">Custom Icons (Off/After slots)</div>
			<div class="sizes-demo__section-grid">
				<div class="sizes-demo__section-item">
					<div class="sizes-demo__section-label">Off icon (OFF)</div>
					<Switch
						:visible="visible"
						:rendered="rendered"
						size="lg"
						variant="accent"
						:value="false"
					>
						<template #off>
							<Icon :tag="useIconImport('close')" size="lg" />
						</template>
					</Switch>
				</div>
				<div class="sizes-demo__section-item">
					<div class="sizes-demo__section-label">After icon (ON)</div>
					<Switch
						:visible="visible"
						:rendered="rendered"
						size="lg"
						variant="positive"
						:value="true"
					>
						<template #on>
							<Icon :tag="useIconImport('check')" size="lg" />
						</template>
					</Switch>
				</div>
				<div class="sizes-demo__section-item">
					<div class="sizes-demo__section-label">Both icons</div>
					<Switch
						:visible="visible"
						:rendered="rendered"
						size="lg"
						variant="negative"
						:value="true"
					>
						<template #off>
							<Icon :tag="useIconImport('close')" size="lg" />
						</template>
						<template #on>
							<Icon :tag="useIconImport('home')" size="lg" />
						</template>
					</Switch>
				</div>
			</div>
		</div>

		<!-- States examples -->
		<div class="sizes-demo__section">
			<div class="sizes-demo__section-title">Special States</div>
			<div class="sizes-demo__section-grid">
				<div class="sizes-demo__section-item">
					<div class="sizes-demo__section-label">Disabled (OFF)</div>
					<Switch
						:visible="visible"
						:rendered="rendered"
						size="lg"
						variant="accent"
						:value="false"
						:disabled="true"
					/>
				</div>
				<div class="sizes-demo__section-item">
					<div class="sizes-demo__section-label">Disabled (ON)</div>
					<Switch
						:visible="visible"
						:rendered="rendered"
						size="lg"
						variant="positive"
						:value="true"
						:disabled="true"
					/>
				</div>
				<div class="sizes-demo__section-item">
					<div class="sizes-demo__section-label">Readonly</div>
					<Switch
						:visible="visible"
						:rendered="rendered"
						size="lg"
						variant="caution"
						:value="true"
						:readonly="true"
					/>
				</div>
			</div>
		</div>
	</div>
</template>

<style lang="scss">
.sizes-demo {
	$this: &;

	&__title {
		font-weight: 600;
		font-size: 1.125rem;
		line-height: 1.75rem;
		margin-bottom: 1rem;
		text-align: center;
	}

	&__subtitle {
		font-weight: 600;
		font-size: 1rem;
		line-height: 1.5rem;
		margin-top: 1.5rem;
		margin-bottom: 0.5rem;
		color: #1f2937;
	}

	&__grid {
		margin-bottom: 2rem;
	}

	&__grid-header {
		display: grid;
		border-bottom: 2px solid #d1d5db;
		margin-bottom: 0.5rem;
		padding-bottom: 0.5rem;
		grid-template-columns: 120px repeat(6, 1fr);
	}

	&__grid-row {
		display: grid;
		border-bottom: 1px solid #e5e7eb;
		padding-top: 0.5rem;
		padding-bottom: 0.5rem;
		grid-template-columns: 120px repeat(6, 1fr);
	}

	&__grid-cell {
		display: flex;
		align-items: center;
		justify-content: center;
		padding-left: 0.5rem;
		padding-right: 0.5rem;

		&--header {
			font-weight: 600;
			font-size: 0.875rem;
			line-height: 1.25rem;
			color: #374151;
		}

		&--label {
			font-weight: 500;
			font-size: 0.875rem;
			line-height: 1.25rem;
			color: #4b5563;
			justify-content: flex-start;
		}
	}

	&__section {
		margin-bottom: 1.5rem;
	}

	&__section-title {
		font-weight: 600;
		font-size: 1rem;
		line-height: 1.5rem;
		margin-bottom: 0.75rem;
		color: #1f2937;
	}

	&__section-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 1rem;

		@media (min-width: 768px) {
			grid-template-columns: repeat(4, minmax(0, 1fr));
		}

		@media (min-width: 1024px) {
			grid-template-columns: repeat(6, minmax(0, 1fr));
		}
	}

	&__section-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
	}

	&__section-label {
		font-size: 0.75rem;
		line-height: 1rem;
		color: #4b5563;
		text-align: center;
	}
}
</style>
