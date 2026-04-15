import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/Solar_radiation-sensor_data_cleaning_tool/',
  plugins: [react()],
})
