// Commit message conventions:
// feat: new feature
// fix: bug fix
// refactor: code restructuring
// docs: documentation changes
// style: formatting, no logic change
// test: test additions/fixes
// chore: maintenance tasks
// ci: CI/CD changes
// perf: performance improvements
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'refactor',
        'docs',
        'style',
        'test',
        'chore',
        'ci',
        'perf',
        'revert',
      ],
    ],
    'subject-case': [2, 'never', ['sentence-case', 'start-case', 'pascal-case', 'upper-case']],
    'subject-length': [2, 'always', 100],
  },
}
