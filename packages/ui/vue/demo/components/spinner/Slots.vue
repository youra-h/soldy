<script setup lang="ts">
import { Spinner, Icon, useIconImport } from '@soldy/ui-vue'
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

		<!-- Grid with all sizes and variants -->
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
					<Spinner
						:visible="visible"
						:rendered="rendered"
						:size="size"
						:variant="variant"
					/>
				</div>
			</div>
		</div>

		<!-- Slot demo -->
		<div class="sizes-demo__slot-section">
			<div class="sizes-demo__slot-title">Spinner with Slot (Icon inside)</div>
			<div class="sizes-demo__slot-grid">
				<div v-for="size in sizes" :key="size" class="sizes-demo__slot-item">
					<div class="sizes-demo__slot-label">{{ size }}</div>
					<Spinner
						:visible="visible"
						:rendered="rendered"
						:size="size"
						variant="accent"
						class="sizes-demo__spinner-with-slot"
					>
						<Icon
							:tag="useIconImport('home')"
							:size="size"
							class="sizes-demo__slot-icon"
						/>
					</Spinner>
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

	&__grid {
		margin-bottom: 1.5rem;
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

		&:last-child {
			border-bottom-width: 0;
		}
	}

	&__grid-cell {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0.5rem;

		&--header {
			font-weight: 600;
			font-size: 0.875rem;
			line-height: 1.25rem;
			color: #374151;
		}

		&--label {
			font-family:
				ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono',
				'Courier New', monospace;
			font-size: 0.875rem;
			line-height: 1.25rem;
			color: #4b5563;
			justify-content: flex-start;
		}
	}

	&__slot-section {
		margin-top: 1.5rem;
		padding-top: 1.5rem;
		border-top: 2px solid #d1d5db;
	}

	&__slot-title {
		font-weight: 600;
		margin-bottom: 1rem;
		text-align: center;
	}

	&__slot-grid {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
		justify-content: center;
	}

	&__slot-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem;
		border: 1px solid #e5e7eb;
		border-radius: 0.25rem;
		background-color: #f9fafb;
	}

	&__slot-label {
		font-size: 0.75rem;
		line-height: 1rem;
		color: #4b5563;
		font-family:
			ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New',
			monospace;
	}

	&__spinner-with-slot {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	&__slot-icon {
		position: absolute;
		color: #2563eb;
	}
}
</style>
