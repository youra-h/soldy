<script setup lang="ts">
import { Skeleton, Button, CheckBox, Switch } from '@soldy/ui-vue'
import type { TComponentVariant, TSkeletonShape, TSkeletonAnimation } from '@soldy/core'

type Props = {
	visible?: boolean
	rendered?: boolean
}

const props = defineProps<Props>()

const variations = [
	{
		variant: 'normal' as TComponentVariant,
		shape: 'rect' as TSkeletonShape,
		animation: 'pulse' as TSkeletonAnimation,
	},
	{
		variant: 'accent' as TComponentVariant,
		shape: 'rounded' as TSkeletonShape,
		animation: 'wave' as TSkeletonAnimation,
	},
	{
		variant: 'positive' as TComponentVariant,
		shape: 'circle' as TSkeletonShape,
		animation: 'pulse' as TSkeletonAnimation,
	},
	{
		variant: 'negative' as TComponentVariant,
		shape: 'rect' as TSkeletonShape,
		animation: 'wave' as TSkeletonAnimation,
	},
	{
		variant: 'caution' as TComponentVariant,
		shape: 'rounded' as TSkeletonShape,
		animation: 'none' as TSkeletonAnimation,
	},
]
const shapes: TSkeletonShape[] = ['rect', 'rounded', 'circle']
const animations: TSkeletonAnimation[] = ['pulse', 'wave', 'none']
</script>

<template>
	<div class="sizes-demo">
		<!-- Variants grid -->
		<div class="sizes-demo__section">
			<div class="sizes-demo__title">Variants (rect, pulse, w=120px, h=40px)</div>
			<div class="sizes-demo__shapes">
				<div v-for="v in variations" :key="v.variant" class="sizes-demo__shape-item">
					<div class="sizes-demo__shape-label">{{ v.variant }}</div>
					<Skeleton
						:visible="visible"
						:rendered="rendered"
						:variant="v.variant"
						:shape="v.shape"
						:animation="v.animation"
						width="120px"
						height="40px"
					/>
				</div>
			</div>
		</div>

		<!-- Shapes -->
		<div class="sizes-demo__section">
			<div class="sizes-demo__title">Shapes (accent, pulse, width=64px, height=64px)</div>
			<div class="sizes-demo__shapes">
				<div v-for="shape in shapes" :key="shape" class="sizes-demo__shape-item">
					<div class="sizes-demo__shape-label">{{ shape }}</div>
					<Skeleton
						:visible="visible"
						:rendered="rendered"
						variant="accent"
						:shape="shape"
						animation="pulse"
						width="64px"
						height="64px"
					/>
				</div>
			</div>
		</div>

		<!-- Animations -->
		<div class="sizes-demo__section">
			<div class="sizes-demo__title">Animations (normal, rect, width=200px, height=32px)</div>
			<div class="sizes-demo__shapes">
				<div v-for="anim in animations" :key="anim" class="sizes-demo__shape-item">
					<div class="sizes-demo__shape-label">{{ anim }}</div>
					<Skeleton
						:visible="visible"
						:rendered="rendered"
						variant="normal"
						shape="rect"
						:animation="anim"
						width="200px"
						height="32px"
					/>
				</div>
			</div>
		</div>

		<!-- Slot demo: skeleton wraps real components -->
		<div class="sizes-demo__section">
			<div class="sizes-demo__title">
				Skeleton wraps real components (visible=true → skeleton shown)
			</div>
			<div class="sizes-demo__slot-grid">
				<div class="sizes-demo__slot-item">
					<div class="sizes-demo__slot-label">Button</div>
					<Skeleton
						:visible="visible"
						:rendered="rendered"
						variant="accent"
						shape="rounded"
						animation="wave"
						width="120px"
						height="40px"
					>
						<Button variant="accent">Click Me</Button>
					</Skeleton>
				</div>
				<div class="sizes-demo__slot-item">
					<div class="sizes-demo__slot-label">CheckBox</div>
					<Skeleton
						:visible="visible"
						:rendered="rendered"
						variant="positive"
						shape="circle"
						animation="pulse"
					>
						<CheckBox>Accept terms</CheckBox>
					</Skeleton>
				</div>
				<div class="sizes-demo__slot-item">
					<div class="sizes-demo__slot-label">Switch</div>
					<Skeleton
						:visible="visible"
						:rendered="rendered"
						variant="caution"
						shape="rounded"
						animation="wave"
					>
						<Switch>Enable feature</Switch>
					</Skeleton>
				</div>
			</div>
		</div>
	</div>
</template>

<style lang="scss">
.sizes-demo {
	$this: &;

	&__section {
		margin-bottom: 2rem;
	}

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
		grid-template-columns: 120px repeat(5, 1fr);
	}

	&__grid-row {
		display: grid;
		padding-top: 0.5rem;
		padding-bottom: 0.5rem;
		border-bottom: 1px solid #f3f4f6;
		grid-template-columns: 120px repeat(5, 1fr);
	}

	&__grid-cell {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0.5rem;

		&--header {
			font-weight: 500;
			font-size: 0.875rem;
			line-height: 1.25rem;
			color: #4b5563;
		}

		&--label {
			font-weight: 500;
			font-size: 0.875rem;
			line-height: 1.25rem;
			color: #6b7280;
			justify-content: flex-start;
		}
	}

	&__shapes {
		display: flex;
		gap: 2rem;
		justify-content: center;
		flex-wrap: wrap;
	}

	&__shape-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
	}

	&__shape-label {
		font-size: 0.875rem;
		line-height: 1.25rem;
		color: #6b7280;
		text-transform: capitalize;
	}

	&__slot-grid {
		display: flex;
		gap: 1.5rem;
		justify-content: center;
		flex-wrap: wrap;
	}

	&__slot-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
	}

	&__slot-label {
		font-size: 0.875rem;
		line-height: 1.25rem;
		color: #6b7280;
		font-weight: 500;
	}
}
</style>
