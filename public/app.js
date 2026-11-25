const list = document.getElementById('list');
const fileInput = document.getElementById('fileInput');
const uploadBtn = document.getElementById('uploadBtn');
const statusBox = document.getElementById('status');
const count = document.getElementById('count');

function formatSize(bytes) {
  return bytes < 1024 * 1024
    ? (bytes / 1024).toFixed(1) + ' КБ'
    : (bytes / (1024 * 1024)).toFixed(1) + ' МБ';
}

function formatDate(date) {
  return new Date(date).toLocaleString('ru-RU');
}

async function loadFiles() {
  list.innerHTML = '<div class="empty">Загрузка...</div>';

  try {
    const res = await fetch('/api/files');
    const files = await res.json();

    count.textContent = files.length + ' файлов';

    if (!files.length) {
      list.innerHTML = '<div class="empty">Пока нет презентаций. Добавь первую!</div>';
      return;
    }

    list.innerHTML = '';

    files.forEach(file => {
      const isPDF = file.type === '.pdf';

      const item = document.createElement('div');
      item.className = 'item';

      const left = document.createElement('div');
      left.className = 'item-left';

      const icon = document.createElement('div');
      icon.className = 'file-icon ' + (isPDF ? 'pdf' : 'ppt');
      icon.textContent = isPDF ? 'PDF' : 'PPT';

      const info = document.createElement('div');
      info.className = 'file-info';

      const name = document.createElement('h3');
      name.textContent = file.name;

      const details = document.createElement('p');
      details.textContent = formatSize(file.size) + ' · ' + formatDate(file.date);

      info.append(name, details);
      left.append(icon, info);

      const actions = document.createElement('div');
      actions.className = 'actions';

      const openBtn = document.createElement('button');
      openBtn.className = 'open';
      openBtn.textContent = 'Открыть';

      openBtn.onclick = () => {
        const fileUrl = location.origin + '/files/' + encodeURIComponent(file.id);

        if (isPDF) {
          window.open(fileUrl, '_blank');
        } else {
          const viewer = 'https://view.officeapps.live.com/op/view.aspx?src=' +
            encodeURIComponent(fileUrl);
          window.open(viewer, '_blank');
        }
      };

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'delete';
      deleteBtn.textContent = 'Удалить';

      deleteBtn.onclick = async () => {
        if (!confirm('Удалить презентацию "' + file.name + '"?')) return;

        const res = await fetch('/api/files/' + encodeURIComponent(file.id), {
          method: 'DELETE'
        });

        if (!res.ok) {
          alert('Не удалось удалить презентацию');
          return;
        }

        loadFiles();
      };

      actions.append(openBtn, deleteBtn);
      item.append(left, actions);
      list.append(item);
    });
  } catch (e) {
    list.innerHTML = '<div class="empty">Ошибка загрузки списка файлов.</div>';
  }
}

uploadBtn.onclick = () => fileInput.click();

fileInput.onchange = async () => {
  const file = fileInput.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append('presentation', file);

  statusBox.textContent = 'Загрузка файла...';
  uploadBtn.disabled = true;

  try {
    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    });

    const data = await res.json();

    if (!res.ok) throw new Error(data.error || 'Ошибка загрузки');

    statusBox.textContent = 'Презентация добавлена!';
    fileInput.value = '';
    loadFiles();
  } catch (e) {
    statusBox.textContent = e.message;
  } finally {
    uploadBtn.disabled = false;
  }
};

loadFiles();
