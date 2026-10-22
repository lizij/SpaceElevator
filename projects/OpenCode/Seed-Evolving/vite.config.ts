import { defineConfig } from 'vite'

export default defineConfig({
  // 合集统一部署：相对路径，支持任意子路径（含 GitHub Pages 项目页）
  base: './',
  server: {
    host: true,
    port: 5173
  }
})
