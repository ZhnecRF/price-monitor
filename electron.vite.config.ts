import { defineConfig } from 'electron-vite'

export default defineConfig({
  main: {
    build: {
      rollupOptions: {
        // ❗ Не бандлим native-модуль, чтобы require искал его в node_modules
        external: ['better-sqlite3']
      },
      commonjsOptions: {
        // ❗ Разрешаем динамические require'ы (bindings ищет .node бинарь)
        ignoreDynamicRequires: true,
        dynamicRequireTargets: [
          // подстрахуем пути бинаря
          'node_modules/better-sqlite3/build/Release/better_sqlite3.node',
          'node_modules/better-sqlite3/**/*'
        ]
      }
    }
  },
  preload: {
    build: {
      rollupOptions: { external: [] }
    }
  },
  renderer: {}
})
