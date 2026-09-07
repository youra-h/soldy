<script setup lang="ts">
import { ref } from 'vue'
import { TTabs, TTabsCollection, TabsFactory } from '@soldy/core'
import type { ITabsItem } from '@soldy/core'
import { Tabs, DragAndDrop } from '@soldy/ui-vue'

// --- Вариант 1: через instance (программный) ---

const tabs = new TTabs()
tabs.variant = 'accent'
tabs.view = 'contained'
tabs.orientation = 'horizontal'

function onEngineCreate(engine) {
	const { plain, activation } = engine.extensions

	plain.push({ text: 'Tab 1', value: 'tab1', closable: true })
	const tab = plain.push({ text: 'Tab 2', value: 'tab2', closable: true })
	plain.push({ text: 'Tab 3', value: 'tab3' })

	activation.activate(tab)
}

// --- Вариант 2: через prop items ---
const tabItems = [
	{ text: 'Alpha', value: 'alpha', closable: true },
	{ text: 'Beta', value: 'beta', closable: true, _: { active: true } },
	{ text: 'Gamma', value: 'gamma', closable: true, disabled: true },
]

const closable = ref(false)

setTimeout(() => {
	console.log('Setting closable to true')
	closable.value = true
}, 1000)
</script>

<template>
	<div style="display: flex; flex-direction: column; gap: 2rem">
		<div class="tabs-slots-demo__section">
			<h4 class="tabs-slots-demo__subtitle">Closable tabs</h4>
			<Tabs :closable="closable">
				<Tabs.Item text="Tab 1" value="t1" />
				<Tabs.Item text="Tab 2" value="t2" active />
				<Tabs.Item text="Tab 3 (not closable)" value="t3" :closable="false" />
				<template #content>
					<Tabs.Content value="t1"><p>Content 1</p></Tabs.Content>
					<Tabs.Content value="t2"><p>Content 2</p></Tabs.Content>
					<Tabs.Content value="t3"><p>Content 3</p></Tabs.Content>
				</template>
			</Tabs>
		</div>

		<section>
			<h2>Drag-and-drop</h2>
			<DragAndDrop>
				<Tabs>
					<Tabs.Item text="Tab 1" value="t1" active />
					<Tabs.Item text="Tab 2" value="t2" />
					<Tabs.Item text="Tab 3" value="t3" />
					<template #content>
						<Tabs.Content value="t1"><p>Content 1</p></Tabs.Content>
						<Tabs.Content value="t2"><p>Content 2</p></Tabs.Content>
						<Tabs.Content value="t3"><p>Content 3</p></Tabs.Content>
					</template>
				</Tabs>
			</DragAndDrop>
		</section>

		<section>
			<h2>Вариант 1: программный (через instance)</h2>
			<Tabs :ctrl="tabs" @engine:create="onEngineCreate">
				<template #content>
					<Tabs.Content value="tab1"><p>Содержимое Tab 1</p></Tabs.Content>
					<Tabs.Content value="tab2"><p>Содержимое Tab 2</p></Tabs.Content>
					<Tabs.Content value="tab3"><p>Содержимое Tab 3</p></Tabs.Content>
				</template>
			</Tabs>
		</section>

		<section>
			<h2>Вариант 2: prop items</h2>
			<Tabs :items="tabItems" view="outline" variant="normal">
				<template #leading>leading</template>
				<template #content>
					<Tabs.Content value="alpha"><p>Содержимое Alpha</p></Tabs.Content>
					<Tabs.Content value="beta"><p>Содержимое Beta</p></Tabs.Content>
					<Tabs.Content value="gamma"><p>Содержимое Gamma</p></Tabs.Content>
				</template>
				<template #trailing>trailing</template>
			</Tabs>
		</section>
		<!--
		<section>
			<h2>Вариант 3: декларативный (TabsItem в слоте)</h2>
			<Tabs view="contained">
				<template #leading>leading</template>
				<Tabs.Item text="Профиль" value="profile" />
				<Tabs.Item text="Настройки" value="settings" active />
				<Tabs.Item text="О проекте" value="about" />
				<template #content>
					<Tabs.Content value="profile"><p>Содержимое Профиль</p></Tabs.Content>
					<Tabs.Content value="settings"><p>Содержимое Настройки</p></Tabs.Content>
					<Tabs.Content value="about"><p>Содержимое О проекте</p></Tabs.Content>
				</template>
				<template #trailing>trailing</template>
			</Tabs>
		</section>

		<section>
			<h2>Вариант 4: вертикальные табы (position: start — по умолчанию)</h2>
			<Tabs view="contained" variant="positive" orientation="vertical">
				<Tabs.Item text="Профиль" value="profile" active />
				<Tabs.Item text="Настройки" value="settings" />
				<Tabs.Item text="О проекте" value="about" />
				<template #content>
					<Tabs.Content value="profile"><p>Содержимое Профиль</p></Tabs.Content>
					<Tabs.Content value="settings"><p>Содержимое Настройки</p></Tabs.Content>
					<Tabs.Content value="about"><p>Содержимое О проекте</p></Tabs.Content>
				</template>
			</Tabs>
		</section>

		<section>
			<h2>Вариант 5: вертикальные табы (position: end — список справа)</h2>
			<Tabs view="contained" variant="positive" orientation="vertical" position="end">
				<Tabs.Item text="Профиль" value="profile" active />
				<Tabs.Item text="Настройки" value="settings" />
				<Tabs.Item text="О проекте" value="about" />
				<template #content>
					<Tabs.Content value="profile"><p>Содержимое Профиль</p></Tabs.Content>
					<Tabs.Content value="settings"><p>Содержимое Настройки</p></Tabs.Content>
					<Tabs.Content value="about"><p>Содержимое О проекте</p></Tabs.Content>
				</template>
			</Tabs>
		</section>

		<section>
			<h2>Вариант 6: alignment — center</h2>
			<Tabs view="line" alignment="center">
				<Tabs.Item text="Tab 1" value="t1" active />
				<Tabs.Item text="Tab 2" value="t2" />
				<Tabs.Item text="Tab 3" value="t3" />
			</Tabs>
		</section>

		<section>
			<h2>Вариант 7: alignment — end</h2>
			<Tabs view="contained" alignment="end">
				<Tabs.Item text="Tab 1" value="t1" active />
				<Tabs.Item text="Tab 2" value="t2" />
				<Tabs.Item text="Tab 3" value="t3" />
			</Tabs>
		</section>

		<section>
			<h2>Вариант 8: alignment — stretch (justify-between)</h2>
			<Tabs view="contained" alignment="stretch">
				<Tabs.Item text="Tab 1" value="t1" active />
				<Tabs.Item text="Tab 2" value="t2" />
				<Tabs.Item text="Tab 3" value="t3" />
			</Tabs>
		</section> -->
	</div>
</template>
