// Debug script to test pattern matching
const pattern = 'AnswersInGenesis_{MM}{DD}{YY}';
const filename = 'AnswersInGenesis_052727';

console.log('Pattern:', pattern);
console.log('Filename:', filename);

// Replicate the CORRECTED pattern matching logic
let regexPattern = pattern
  // Handle date/time placeholders
  .replace(/\{YYYY\}/g, '\\d{4}')        // 4-digit year
  .replace(/\{YY\}/g, '\\d{2}')          // 2-digit year
  .replace(/\{MM\}/g, '\\d{1,2}')        // Month
  .replace(/\{DD\}/g, '\\d{1,2}')        // Day
  .replace(/\{HH\}/g, '\\d{1,2}')        // Hour
  .replace(/\{mm\}/g, '\\d{1,2}')        // Minute
  .replace(/\{ss\}/g, '\\d{1,2}')        // Second
  .replace(/\{DOTW\}/g, '[A-Za-z]+')     // Day of the week
  .replace(/\{DOW\}/g, '[A-Za-z]{3}')    // Day of week (3 letters)
  .replace(/\{MONTH\}/g, '[A-Za-z]+')    // Month name
  .replace(/\{MON\}/g, '[A-Za-z]{3}')    // Month (3 letters)
  // Handle wildcard patterns
  .replace(/\*/g, '.*')                  // * becomes .*
  .replace(/\?/g, '.')                   // ? becomes .
  // Escape remaining regex special characters (but NOT backslashes that are part of our regex)
  .replace(/[.+^$|[\]]/g, '\\$&')        // Removed \\ from the character class

console.log('Regex pattern:', regexPattern);

const regex = new RegExp(`^${regexPattern}$`, 'i');
console.log('Full regex:', regex);

const matches = regex.test(filename);
console.log('Matches:', matches);

// Test with different filenames
const testFiles = [
  'AnswersInGenesis_052727',
  'AnswersInGenesis_5277',
  'AnswersInGenesis_52727',
  'AnswersInGenesis_052725.mp3'
];

console.log('\nTesting different filenames:');
testFiles.forEach(file => {
  const match = regex.test(file);
  console.log(`${file}: ${match}`);
});

// Test step by step
console.log('\nStep by step:');
console.log('After {MM} replacement:', pattern.replace(/\{MM\}/g, '\\d{1,2}'));
console.log('After {DD} replacement:', pattern.replace(/\{MM\}/g, '\\d{1,2}').replace(/\{DD\}/g, '\\d{1,2}'));
console.log('After {YY} replacement:', pattern.replace(/\{MM\}/g, '\\d{1,2}').replace(/\{DD\}/g, '\\d{1,2}').replace(/\{YY\}/g, '\\d{2}')); 