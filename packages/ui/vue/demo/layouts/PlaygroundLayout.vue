<script setup lang="ts">
type Props = {
	title: string
}

defineProps<Props>()
</script>

<template>
	<div class="pg-layout">
		<!-- Header -->
		<div class="pg-layout__header">
			<h1 class="pg-layout__title">{{ title }}</h1>
		</div>

		<!-- Row 1: Properties Panel -->
		<div class="pg-layout__section pg-layout__section--properties">
			<h2 class="pg-layout__section-title">Properties</h2>
			<slot name="properties" />
		</div>

		<!-- Row 2: Three Column Demo -->
		<div class="pg-layout__demo-grid" >
			<!-- Column 1: Props Demo -->
			<div class="pg-layout__demo-column" v-if="$slots['props-demo']">
				<h3 class="pg-layout__demo-title">Props Demo</h3>
				<div class="pg-layout__demo-content">
					<slot name="props-demo" />
				</div>
			</div>

			<!-- Column 2: Instance Demo -->
			<div class="pg-layout__demo-column" v-if="$slots['instance-demo']">
				<h3 class="pg-layout__demo-title">Instance Demo</h3>
				<div class="pg-layout__demo-content">
					<slot name="instance-demo" />
				</div>
			</div>

			<!-- Column 3: Slots Demo -->
			<div class="pg-layout__demo-column" v-if="$slots['slots-demo']">
				<h3 class="pg-layout__demo-title">Slots Demo</h3>
				<div class="pg-layout__demo-content">
					<slot name="slots-demo" />
				</div>
			</div>
		</div>
	</div>
</template>
