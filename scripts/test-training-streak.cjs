const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { readFileSync } = require('node:fs');
const ts = require('typescript');
const { test } = require('node:test');

require.extensions['.ts'] = (module, filename) => {
  const { outputText } = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: filename,
  });
  module._compile(outputText, filename);
};

const { GetTrainingStreakUseCase } = require('../src/application/use-cases/workout/get-training-streak.use-case.ts');
const { addDaysUTC, formatDateOnly, parseDateOnly, todayDateOnly } = require('../src/shared/utils/week.ts');

function day(offset) {
  return formatDateOnly(addDaysUTC(parseDateOnly(todayDateOnly()), offset));
}

function calculate(dates, restWeekdays) {
  return new GetTrainingStreakUseCase(
    { findDistinctDatesByUserInRange: async () => dates },
    { find: async () => ({ restWeekdays }) },
  ).execute('test-user');
}

if (process.argv.includes('--all-rest-probe')) {
  Promise.all([
    calculate([], [0, 1, 2, 3, 4, 5, 6]),
    calculate([day(0), day(-120)], [0, 1, 2, 3, 4, 5, 6]),
  ]).then(results => console.log(JSON.stringify(results)));
} else {
  test('all seven rest days stop at the repository lookback boundary', () => {
    const result = spawnSync(process.execPath, [__filename, '--all-rest-probe'], {
      encoding: 'utf8',
      timeout: 2_000,
    });
    assert.ifError(result.error);
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout), [
      { days: 0, hasData: false },
      { days: 2, hasData: true },
    ]);
  });

  test('today is not a missed day yet; a past missed day still ends the streak', async () => {
    assert.deepEqual(await calculate([day(-1), day(-2), day(-4)], []), { days: 2, hasData: true });
    assert.deepEqual(await calculate([day(-2)], []), { days: 0, hasData: false });
  });

  test('a workout on a rest day counts and repeated workouts count once per date', async () => {
    const yesterday = parseDateOnly(day(-1)).getUTCDay();
    assert.deepEqual(await calculate([day(0), day(0), day(-2)], [yesterday]), { days: 2, hasData: true });
    assert.deepEqual(await calculate([day(0), day(-1)], [yesterday]), { days: 2, hasData: true });
  });
}
