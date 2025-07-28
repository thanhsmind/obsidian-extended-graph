import fs from 'fs';

// How to use:
// node compare-json-keys.mjs i18n/en.json i18n/zh.json [--autofix] [--sort]

function getAllKeys(obj, prefix = '') {
  let keys = [];
  for (const key in obj) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      keys = keys.concat(getAllKeys(obj[key], path));
    } else {
      keys.push(path);
    }
  }
  return keys;
}

function getByPath(obj, path) {
  return path.split('.').reduce((o, k) => (o || {})[k], obj);
}

function setByPath(obj, path, value) {
  const keys = path.split('.');
  let o = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (!(keys[i] in o)) o[keys[i]] = {};
    o = o[keys[i]];
  }
  o[keys[keys.length - 1]] = value;
}

function deleteByPath(obj, path) {
  const keys = path.split('.');
  let o = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (!(keys[i] in o)) return;
    o = o[keys[i]];
  }
  delete o[keys[keys.length - 1]];
}

function sortLike(base, target) {
  if (typeof base !== 'object' || base === null || Array.isArray(base)) return target;
  const result = {};
  for (const key of Object.keys(base)) {
    if (Object.prototype.hasOwnProperty.call(target, key)) {
      if (typeof base[key] === 'object' && base[key] !== null && !Array.isArray(base[key])) {
        result[key] = sortLike(base[key], target[key]);
      } else {
        result[key] = target[key];
      }
    }
  }
  // Optionally, add extra keys in target not in base at the end
  for (const key of Object.keys(target)) {
    if (!Object.prototype.hasOwnProperty.call(base, key)) {
      result[key] = target[key];
    }
  }
  return result;
}

function main(file1, file2, autofix = false, sort = false) {
  const json1 = JSON.parse(fs.readFileSync(file1, 'utf8'));
  let json2 = JSON.parse(fs.readFileSync(file2, 'utf8'));

  const keys1 = new Set(getAllKeys(json1));
  const keys2 = new Set(getAllKeys(json2));

  const onlyIn1 = [...keys1].filter(k => !keys2.has(k));
  const onlyIn2 = [...keys2].filter(k => !keys1.has(k));

  console.log(`Keys only in ${file1}:`);
  onlyIn1.forEach(k => console.log('  ' + k));
  console.log(`\nKeys only in ${file2}:`);
  onlyIn2.forEach(k => console.log('  ' + k));

  if (autofix) {
    onlyIn1.forEach(k => {
      setByPath(json2, k, getByPath(json1, k));
    });
    onlyIn2.forEach(k => {
      deleteByPath(json2, k);
    });
  }
  if (sort) {
    json2 = sortLike(json1, json2);
  }
  if (autofix || sort) {
    fs.writeFileSync(file2, JSON.stringify(json2, null, 4), 'utf8');
    console.log(`\n[autofix/sort] ${file2} has been updated.`);
  }
}

const args = process.argv.slice(2);
const autofix = args.includes('--autofix');
const sort = args.includes('--sort');
const files = args.filter(a => !a.startsWith('--'));
if (files.length !== 2) {
  console.log('Usage: node compare-json-keys.mjs <file1.json> <file2.json> [--autofix] [--sort]');
  process.exit(1);
}

main(files[0], files[1], autofix, sort);
