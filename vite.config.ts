import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { sentryVitePlugin } from '@sentry/vite-plugin'

// رفع خرائط الكود (sourcemaps) لـ Sentry عشان تقارير الأخطاء تحدد الملف
// والسطر الحقيقي بدل أسماء مشفّرة. بيشتغل بس لما SENTRY_AUTH_TOKEN موجود
// في متغيرات البيئة (مضبوط في Vercel)، وغير كده البناء بيكمل عادي من غيره.
const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN

export default defineConfig({
  plugins: [
    react(),
    ...(sentryAuthToken
      ? [
          sentryVitePlugin({
            org: 'c50357304f53',
            project: 'qudrat-web',
            authToken: sentryAuthToken,
            // لو رفع الخرائط فشل لأي سبب، مانوقفش نشر الموقع بسببه
            errorHandler: (err) => {
              console.warn('[sentry] تعذّر رفع خرائط الكود:', err.message)
            },
            sourcemaps: {
              // الخرائط بتتبعت لـ Sentry وبعدين تتمسح من ملفات النشر
              // عشان ما تتنشرش على الموقع للناس.
              filesToDeleteAfterUpload: ['**/*.js.map'],
            },
          }),
        ]
      : []),
  ],
  build: {
    // مطلوبة عشان الخرائط تتولّد أصلًا
    sourcemap: Boolean(sentryAuthToken),
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
  },
})
