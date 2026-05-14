// Husky config — git hooks for ai-ops
// Usage: npx husky add .husky/pre-commit "npx lint-staged"
module.exports = {
  hooks: {
    'pre-commit': 'lint-staged',
    'commit-msg': 'commitlint --edit',
  },
}
