/**
 * Wrap a progress callback so it only ever reports values within 0-100,
 * each one higher than the last
 */
export function createProgressReporter(
  callback?: (progress: number) => void
): ((progress: number) => void) | undefined {
  if (!callback) {
    return undefined;
  }

  let lastReported = -1;

  return (progress: number) => {
    const value = Math.min(100, Math.max(0, progress));
    if (value > lastReported) {
      lastReported = value;
      callback(value);
    }
  };
}
