import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // host: true → 같은 Wi-Fi의 스마트폰이 PC의 네트워크 IP로 접속 가능
  server: { host: true, port: 5173 },
  preview: { host: true, port: 4173 },
});
