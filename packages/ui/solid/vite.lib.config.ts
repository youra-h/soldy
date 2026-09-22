// Расширение обязательно: с ним конфиг читает и нативный загрузчик Vite
import solid from 'vite-plugin-solid'
import { libConfig } from '../../../tools/vite/lib.config.ts'

/**
 * Библиотечная сборка @soldy-ui/solid: компоненты на headless-моделях ядра.
 *
 * Плагин обязателен: JSX Solid компилируется в вызовы его рантайма, а не в
 * `createElement`, и без плагина сборка встала бы на первом `.tsx`. Декларации
 * собирает `tsc -p tsconfig.build.json` вторым шагом скрипта `build`.
 */
export default libConfig({
	name: '@soldy-ui/solid',
	root: import.meta.dirname,
	entry: 'src/index.ts',
	external: ['solid-js'],
	plugins: [solid()],
})
