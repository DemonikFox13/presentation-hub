const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 8000;

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
const DATA_FILE = path.join(DATA_DIR, 'files.json');

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, '[]');
}

function readFiles() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function saveFiles(files) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(files, null, 2));
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => cb(null, crypto.randomUUID())
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, ext === '.pdf' || ext === '.pptx');
  }
});

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/files', (req, res) => {
  const files = readFiles();
  res.json(files.filter(f => fs.existsSync(path.join(UPLOAD_DIR, f.id))));
});

app.post('/api/upload', upload.single('presentation'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Выбери PDF или PPTX' });
  }

  const files = readFiles();

  const item = {
    id: req.file.filename,
    name: path.basename(req.file.originalname),
    size: req.file.size,
    date: new Date().toISOString(),
    type: path.extname(req.file.originalname).toLowerCase()
  };

  files.unshift(item);
  saveFiles(files);

  res.json(item);
});

app.get('/files/:id', (req, res) => {
  const files = readFiles();
  const item = files.find(f => f.id === req.params.id);

  if (!item) return res.status(404).send('Файл не найден');

  const filePath = path.join(UPLOAD_DIR, item.id);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send('Файл не найден');
  }

  if (item.type === '.pdf') {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline');
  } else {
    res.setHeader('Content-Disposition', 'attachment; filename="presentation.pptx"');
  }

  res.sendFile(filePath);
});

app.delete('/api/files/:id', (req, res) => {
  const files = readFiles();
  const item = files.find(f => f.id === req.params.id);

  if (!item) return res.status(404).json({ error: 'Файл не найден' });

  const filePath = path.join(UPLOAD_DIR, item.id);

  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  saveFiles(files.filter(f => f.id !== item.id));
  res.json({ success: true });
});

app.get('/health', (req, res) => res.send('OK'));

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'Максимальный размер файла 100 МБ' });
  }

  res.status(400).json({ error: err.message || 'Ошибка' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('Presentation Hub running on port ' + PORT);
});
