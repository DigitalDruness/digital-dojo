import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// This is the standard configuration for a Vite + React project.
// It tells Vite to use the official React plugin to understand
// and compile JSX syntax and other React-specific features.

export default defineConfig({
  plugins: [react()],
});
