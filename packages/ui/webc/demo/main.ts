import '@soldy/theme-oren'
import './demo.css'

// Импорт пакета регистрирует <soldy-button> и <soldy-component-view>
import '@soldy/ui-webc'

import { createApp } from './App'

document.getElementById('app')!.appendChild(createApp())
