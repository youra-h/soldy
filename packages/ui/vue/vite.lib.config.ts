// Расширение обязательно: с ним конфиг читает и нативный загрузчик Vite
import vue from '@vitejs/plugin-vue'
import { libConfig } from '../../../tools/vite/lib.config.ts'

/**
 * Библиотечная сборка @soldy-ui/vue: компоненты на headless-моделях ядра.
 *
 * Стилей в адаптере нет — их отдаёт пакет темы, поэтому CSS сборка не эмитит.
 * Декларации собирает `vue-tsc -p tsconfig.build.json` вторым шагом скрипта
 * `build`: `.vue` обычный `tsc` не читает.
 */
export default libConfig({
	name: '@soldy-ui/vue',
	root: import.meta.dirname,
	entry: 'src/index.ts',
	external: ['vue'],
	plugins: [vue()],
})
