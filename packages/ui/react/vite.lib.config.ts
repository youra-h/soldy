// Расширение обязательно: с ним конфиг читает и нативный загрузчик Vite
import react from '@vitejs/plugin-react'
import { libConfig } from '../../../tools/vite/lib.config.ts'

/**
 * Библиотечная сборка @soldy-ui/react: компоненты на headless-моделях ядра.
 *
 * JSX компилируется automatic-трансформом, поэтому в бандле остаётся импорт
 * `react/jsx-runtime` — подпуть `react`, и под external он попадает вместе с
 * ним. Декларации собирает `tsc -p tsconfig.build.json` вторым шагом скрипта
 * `build`.
 */
export default libConfig({
	name: '@soldy-ui/react',
	root: import.meta.dirname,
	entry: 'src/index.ts',
	external: ['react', 'react-dom'],
	plugins: [react()],
})
