// lint-staged config
module.exports = {
  'frontend/src/**/*.{js,jsx}': [
    'cd frontend && npm run lint:fix',
  ],
  'backend/src/**/*.{js,jsx}': [
    'cd backend && npm run lint:fix',
  ],
  '**/*.md': [
    'prettier --write',
  ],
}
