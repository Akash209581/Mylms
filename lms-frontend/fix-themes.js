const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function (file) {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory() && !file.includes('node_modules') && !file.includes('.next')) {
            results = results.concat(walk(file));
        } else {
            if (file.endsWith('.tsx') || file.endsWith('.ts')) {
                results.push(file);
            }
        }
    });
    return results;
}

const files = walk('./app').concat(walk('./components'));

let changedFiles = 0;
files.forEach(f => {
    let content = fs.readFileSync(f, 'utf8');
    let original = content;

    // Replace hardcoded backgrounds
    content = content.replace(/\bbg-white\b/g, 'bg-[var(--bg-surface)]');
    content = content.replace(/\bbg-slate-50\b/g, 'bg-[var(--bg-raised)]');
    content = content.replace(/\bbg-slate-100\b/g, 'bg-[var(--bg-hover)]');

    // Replace text colors
    content = content.replace(/\btext-slate-900\b/g, 'text-[var(--text-primary)]');
    content = content.replace(/\btext-slate-800\b/g, 'text-[var(--text-primary)]');
    content = content.replace(/\btext-slate-700\b/g, 'text-[var(--text-primary)]');
    content = content.replace(/\btext-slate-600\b/g, 'text-[var(--text-secondary)]');
    content = content.replace(/\btext-slate-500\b/g, 'text-[var(--text-secondary)]');
    content = content.replace(/\btext-gray-900\b/g, 'text-[var(--text-primary)]');
    content = content.replace(/\btext-gray-800\b/g, 'text-[var(--text-primary)]');
    content = content.replace(/\btext-gray-700\b/g, 'text-[var(--text-primary)]');
    content = content.replace(/\btext-gray-600\b/g, 'text-[var(--text-secondary)]');
    content = content.replace(/\btext-gray-500\b/g, 'text-[var(--text-secondary)]');

    // Replace borders
    content = content.replace(/\bborder-slate-100\b/g, 'border-[var(--border)]');
    content = content.replace(/\bborder-slate-200\b/g, 'border-[var(--border)]');
    content = content.replace(/\bborder-gray-100\b/g, 'border-[var(--border)]');
    content = content.replace(/\bborder-gray-200\b/g, 'border-[var(--border)]');

    if (content !== original) {
        fs.writeFileSync(f, content, 'utf8');
        changedFiles++;
    }
});
console.log(`Updated ${changedFiles} files with theme variables!`);
