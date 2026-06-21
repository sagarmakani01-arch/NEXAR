// File icon mapping for the file tree
export const FILE_ICONS = {
  // JavaScript/TypeScript
  js: 'javascript',
  jsx: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  mjs: 'javascript',
  cjs: 'javascript',
  
  // Web
  html: 'html',
  htm: 'html',
  css: 'css',
  scss: 'scss',
  sass: 'scss',
  less: 'less',
  vue: 'vue',
  svelte: 'svelte',
  
  // Config
  json: 'json',
  jsonc: 'json',
  yaml: 'yaml',
  yml: 'yaml',
  toml: 'toml',
  ini: 'ini',
  cfg: 'ini',
  conf: 'ini',
  config: 'ini',
  
  // Markdown/Docs
  md: 'markdown',
  mdc: 'markdown',
  mdx: 'markdown',
  txt: 'text',
  rtf: 'text',
  
  // Python
  py: 'python',
  pyw: 'python',
  pyc: 'python',
  pyd: 'python',
  
  // Other Languages
  rs: 'rust',
  go: 'go',
  java: 'java',
  kt: 'kotlin',
  swift: 'swift',
  c: 'c',
  cpp: 'cpp',
  cc: 'cpp',
  cxx: 'cpp',
  h: 'c',
  hpp: 'cpp',
  cs: 'csharp',
  php: 'php',
  rb: 'ruby',
  pl: 'perl',
  lua: 'lua',
  r: 'r',
  dart: 'dart',
  scala: 'scala',
  clj: 'clojure',
  hs: 'haskell',
  ml: 'ocaml',
  fs: 'fsharp',
  
  // Shell/Scripts
  sh: 'shell',
  bash: 'shell',
  zsh: 'shell',
  fish: 'shell',
  ps1: 'powershell',
  bat: 'batch',
  cmd: 'batch',
  
  // Docker/DevOps
  dockerfile: 'docker',
  dockerignore: 'docker',
  jenkinsfile: 'jenkins',
  
  // Database
  sql: 'database',
  sqlite: 'database',
  db: 'database',
  
  // Images
  png: 'image',
  jpg: 'image',
  jpeg: 'image',
  gif: 'image',
  svg: 'image',
  webp: 'image',
  ico: 'image',
  bmp: 'image',
  tiff: 'image',
  
  // Fonts
  woff: 'font',
  woff2: 'font',
  ttf: 'font',
  otf: 'font',
  eot: 'font',
  
  // Archives
  zip: 'archive',
  tar: 'archive',
  gz: 'archive',
  rar: 'archive',
  '7z': 'archive',
  
  // Video/Audio
  mp4: 'video',
  webm: 'video',
  mov: 'video',
  mp3: 'audio',
  wav: 'audio',
  ogg: 'audio',
  flac: 'audio',
  
  // Documents
  pdf: 'pdf',
  doc: 'word',
  docx: 'word',
  xls: 'excel',
  xlsx: 'excel',
  ppt: 'powerpoint',
  pptx: 'powerpoint',
  
  // Special files
  gitignore: 'git',
  gitattributes: 'git',
  gitmodules: 'git',
  env: 'env',
  lock: 'lock',
  log: 'log',
};

// Language to Lucide icon name mapping
export const ICON_MAP = {
  javascript: 'FileCode',
  typescript: 'FileCode',
  html: 'FileCode',
  css: 'FileCode',
  scss: 'FileCode',
  sass: 'FileCode',
  less: 'FileCode',
  vue: 'FileCode',
  svelte: 'FileCode',
  json: 'FileJson',
  yaml: 'FileJson',
  yml: 'FileJson',
  toml: 'FileJson',
  ini: 'FileJson',
  markdown: 'FileText',
  text: 'FileText',
  python: 'FileCode',
  rust: 'FileCode',
  go: 'FileCode',
  java: 'FileCode',
  kotlin: 'FileCode',
  swift: 'FileCode',
  c: 'FileCode',
  cpp: 'FileCode',
  csharp: 'FileCode',
  php: 'FileCode',
  ruby: 'FileCode',
  perl: 'FileCode',
  lua: 'FileCode',
  r: 'FileCode',
  dart: 'FileCode',
  scala: 'FileCode',
  clojure: 'FileCode',
  haskell: 'FileCode',
  ocaml: 'FileCode',
  fsharp: 'FileCode',
  shell: 'Terminal',
  powershell: 'Terminal',
  batch: 'Terminal',
  docker: 'Box',
  jenkins: 'Box',
  database: 'Database',
  image: 'Image',
  font: 'Type',
  archive: 'Archive',
  video: 'Video',
  audio: 'Music',
  pdf: 'FileText',
  word: 'FileText',
  excel: 'Table',
  powerpoint: 'Presentation',
  git: 'GitBranch',
  env: 'Key',
  lock: 'Lock',
  log: 'FileText',
};

export function getFileIcon(filename) {
  if (!filename) return 'File';
  
  const ext = filename.split('.').pop()?.toLowerCase();
  if (!ext) return 'File';
  
  // Check for exact filename matches first
  const name = filename.toLowerCase();
  if (name === 'dockerfile' || name === 'dockerfile.prod' || name === 'dockerfile.dev') {
    return 'Box';
  }
  if (name === '.gitignore' || name === '.gitattributes' || name === '.gitmodules') {
    return 'GitBranch';
  }
  if (name === '.env' || name === '.env.local' || name === '.env.production') {
    return 'Key';
  }
  if (name === 'package.json' || name === 'package-lock.json' || name === 'pnpm-lock.yaml' || name === 'yarn.lock') {
    return 'Package';
  }
  if (name === 'readme.md' || name === 'readme.txt' || name === 'readme') {
    return 'BookOpen';
  }
  if (name === 'license' || name === 'license.md' || name === 'license.txt') {
    return 'Shield';
  }
  
  // Check extension
  const lang = FILE_ICONS[ext];
  if (lang && ICON_MAP[lang]) {
    return ICON_MAP[lang];
  }
  
  return 'File';
}

export function getFileColor(filename) {
  if (!filename) return 'text-gray-400';
  
  const ext = filename.split('.').pop()?.toLowerCase();
  if (!ext) return 'text-gray-400';
  
  const colors = {
    js: 'text-yellow-500',
    jsx: 'text-yellow-500',
    ts: 'text-blue-500',
    tsx: 'text-blue-500',
    mjs: 'text-yellow-500',
    cjs: 'text-yellow-500',
    html: 'text-orange-500',
    htm: 'text-orange-500',
    css: 'text-cyan-500',
    scss: 'text-pink-500',
    sass: 'text-pink-500',
    less: 'text-cyan-500',
    vue: 'text-green-500',
    svelte: 'text-orange-500',
    json: 'text-gray-400',
    yaml: 'text-gray-400',
    yml: 'text-gray-400',
    toml: 'text-gray-400',
    ini: 'text-gray-400',
    md: 'text-blue-500',
    txt: 'text-gray-500',
    py: 'text-blue-500',
    rs: 'text-orange-500',
    go: 'text-cyan-500',
    java: 'text-red-500',
    c: 'text-blue-500',
    cpp: 'text-blue-500',
    cs: 'text-purple-500',
    php: 'text-purple-500',
    sh: 'text-green-500',
    bash: 'text-green-500',
    dockerfile: 'text-blue-500',
    png: 'text-purple-500',
    jpg: 'text-purple-500',
    jpeg: 'text-purple-500',
    gif: 'text-purple-500',
    svg: 'text-purple-500',
    webp: 'text-purple-500',
    zip: 'text-red-500',
    tar: 'text-red-500',
    gz: 'text-red-500',
    gitignore: 'text-orange-500',
    env: 'text-yellow-500',
    lock: 'text-red-500',
  };
  
  // Check filename matches
  const name = filename.toLowerCase();
  if (name === 'dockerfile') return 'text-blue-500';
  if (name.startsWith('.git')) return 'text-orange-500';
  if (name.startsWith('.env')) return 'text-yellow-500';
  if (name === 'package.json' || name === 'package-lock.json' || name === 'pnpm-lock.yaml' || name === 'yarn.lock') {
    return 'text-red-500';
  }
  if (name === 'readme.md') return 'text-blue-500';
  if (name === 'license') return 'text-green-500';
  
  return colors[ext] || 'text-gray-400';
}
