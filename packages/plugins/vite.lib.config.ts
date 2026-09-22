// Расширение обязательно: с ним конфиг читает и нативный загрузчик Vite
import { libConfig } from '../../tools/vite/lib.config.ts'

/**
 * Библиотечная сборка @soldy-ui/plugins: плагины поведения над ядром.
 * Декларации собирает `tsc -p tsconfig.build.json` вторым шагом скрипта `build`.
 */
export default libConfig({
	name: '@soldy-ui/plugins',
	root: import.meta.dirname,
	entry: 'src/index.ts',
})
