<script setup lang="ts">
import { watch } from 'vue'
import { Frame, Button } from '@soldy/ui-vue'
import { TFrame } from '@soldy/core'
import PanelDemo from '../../common/PanelDemo.vue'

type Props = {
	customX?: number
	customY?: number
	width?: number | string
	height?: number | string
	position?: 'fixed' | 'absolute'
}

const props = withDefaults(defineProps<Props>(), {
	customX: 50,
	customY: 50,
	width: 280,
	height: 180,
	position: 'fixed',
})

const positions = [
	{ label: 'Top-Left', x: 0, y: 0 },
	{ label: 'Top-Right', x: window.innerWidth - 320, y: 0 },
	{ label: 'Bottom-Left', x: 0, y: window.innerHeight - 220 },
	{ label: 'Bottom-Right', x: window.innerWidth - 320, y: window.innerHeight - 220 },
	{ label: 'Center', x: window.innerWidth / 2 - 140, y: window.innerHeight / 2 - 90 },
	{ label: 'Custom', x: props.customX, y: props.customY },
]

const frames = positions.map((pos) => ({
	...pos,
	instance: new TFrame({
		x: pos.x,
		y: pos.y,
		width: props.width,
		height: props.height,
		visible: false,
		position: props.position as 'fixed' | 'absolute' | undefined,
	}),
}))

// Синхронизация общих пропсов со всеми фреймами
watch(
	() => props.width,
	(val) => {
		frames.forEach((f) => {
			f.instance.width = val
		})
	},
)
watch(
	() => props.height,
	(val) => {
		frames.forEach((f) => {
			f.instance.height = val
		})
	},
)
watch(
	() => props.position,
	(val) => {
		frames.forEach((f) => {
			f.instance.position = val ?? 'fixed'
		})
	},
)
// Синхронизация кастомных координат с Custom-фреймом
watch(
	() => props.customX,
	(val) => {
		const custom = frames.find((f) => f.label === 'Custom')
		if (custom) custom.instance.x = val ?? 50
	},
)
watch(
	() => props.customY,
	(val) => {
		const custom = frames.find((f) => f.label === 'Custom')
		if (custom) custom.instance.y = val ?? 50
	},
)

// Каскадные фреймы — 3 шт со смещением
const cascadeOffset = 40
const cascadeBaseX = window.innerWidth / 2 - 140
const cascadeBaseY = window.innerHeight / 2 - 90
const cascadeFrames = [0, 1, 2].map((i) => ({
	label: `Cascade #${i + 1}`,
	instance: new TFrame({
		x: cascadeBaseX + i * cascadeOffset,
		y: cascadeBaseY + i * cascadeOffset,
		width: props.width,
		height: props.height,
		visible: false,
		position: props.position as 'fixed' | 'absolute' | undefined,
	}),
}))

watch(
	() => props.width,
	(val) => {
		cascadeFrames.forEach((f) => {
			f.instance.width = val
		})
	},
)
watch(
	() => props.height,
	(val) => {
		cascadeFrames.forEach((f) => {
			f.instance.height = val
		})
	},
)
watch(
	() => props.position,
	(val) => {
		cascadeFrames.forEach((f) => {
			f.instance.position = val ?? 'fixed'
		})
	},
)

const openCascade = () => {
	cascadeFrames.forEach((f) => f.instance.show())
}

const closeCascade = () => {
	cascadeFrames.forEach((f) => f.instance.hide())
}

const openFrame = (frame: (typeof frames)[0]) => {
	frame.instance.show()
}

const closeFrame = (frame: (typeof frames)[0]) => {
	frame.instance.hide()
}
</script>

<template>
	<PanelDemo title="Frame Positions Demo" style="position: relative">
		<div class="frame-demo__toolbar">
			<Button
				v-for="pos in positions"
				:key="pos.label"
				class="frame-demo__btn"
				:style="{ '--hue': positions.indexOf(pos) * 45 + 'deg' }"
				@click="openFrame(frames[positions.indexOf(pos)])"
			>
				Open {{ pos.label }}
			</Button>

			<Button class="frame-demo__btn frame-demo__btn--cascade" @click="openCascade">
				Open Cascade
			</Button>
		</div>

		<Frame v-for="f in frames" :key="f.label" :ctrl="f.instance">
			<div class="frame-demo__card">
				<div class="frame-demo__card-header">
					<strong>{{ f.label }}</strong>
					<span class="frame-demo__z">z: {{ f.instance.zIndex }}</span>
				</div>
				<p>Position: ({{ f.instance.x }}, {{ f.instance.y }})</p>
				<p>Size: {{ f.instance.width }} × {{ f.instance.height }}</p>
				<Button class="frame-demo__close" @click="closeFrame(f)">Close</Button>
			</div>
		</Frame>

		<!-- Cascade frames — каскадное открытие -->
		<Frame v-for="f in cascadeFrames" :key="f.label" :ctrl="f.instance">
			<div class="frame-demo__card">
				<div class="frame-demo__card-header">
					<strong>{{ f.label }}</strong>
					<span class="frame-demo__z">z: {{ f.instance.zIndex }}</span>
				</div>
				<p>Offset: +{{ cascadeOffset * (cascadeFrames.indexOf(f) + 1) }}px each</p>
				<p>Size: {{ f.instance.width }} × {{ f.instance.height }}</p>
				<div class="frame-demo__card-actions">
					<Button class="frame-demo__close" @click="f.instance.hide()">Close</Button>
					<Button class="frame-demo__close frame-demo__close--all" @click="closeCascade"
						>Close All</Button
					>
				</div>
			</div>
		</Frame>
	</PanelDemo>
</template>

<style lang="scss" scoped>
.frame-demo {
	&__toolbar {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 0.75rem;
	}

	&__btn {
		padding-left: 1rem;
		padding-right: 1rem;
		padding-top: 0.5rem;
		padding-bottom: 0.5rem;
		font-size: 0.875rem;
		line-height: 1.25rem;
		font-weight: 500;
		color: #ffffff;
		border-radius: 0.375rem;
		box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
		transition-property:
			color, background-color, border-color, text-decoration-color, fill, stroke;
		transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
		transition-duration: 150ms;
		background-color: hsl(var(--hue, 200deg), 60%, 50%);

		&:hover {
			background-color: hsl(var(--hue, 200deg), 60%, 40%);
		}

		&--cascade {
			background-color: hsl(280deg, 60%, 50%);

			&:hover {
				background-color: hsl(280deg, 60%, 40%);
			}
		}
	}

	&__card {
		padding: 1rem;
		background-color: #ffffff;
		border-radius: 0.5rem;
		box-shadow:
			0 10px 15px -3px rgba(0, 0, 0, 0.1),
			0 4px 6px -2px rgba(0, 0, 0, 0.05);
		border: 1px solid #e5e7eb;
		font-size: 0.875rem;
		line-height: 1.25rem;
		color: #374151;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		min-width: 200px;
	}

	&__card-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	&__z {
		font-size: 0.75rem;
		line-height: 1rem;
		color: #9ca3af;
		font-family:
			ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New',
			monospace;
	}

	&__card-actions {
		display: flex;
		gap: 0.5rem;
		align-self: flex-end;
	}

	&__close {
		padding-left: 0.75rem;
		padding-right: 0.75rem;
		padding-top: 0.25rem;
		padding-bottom: 0.25rem;
		font-size: 0.75rem;
		line-height: 1rem;
		font-weight: 500;
		color: #ffffff;
		background-color: #ef4444;
		border-radius: 0.25rem;
		transition-property:
			color, background-color, border-color, text-decoration-color, fill, stroke;
		transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
		transition-duration: 150ms;

		&:hover {
			background-color: #dc2626;
		}

		&--all {
			background-color: #ea580c;

			&:hover {
				background-color: #c2410c;
			}
		}
	}
}
</style>
