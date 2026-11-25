const list = document.getElementById('list');
const fileInput = document.getElementById('fileInput');
const uploadBtn = document.getElementById('uploadBtn');
const statusBox = document.getElementById('status');
const count = document.getElementById('count');

function adminPassword() {
  let password = sessionStorage.getItem('adminPassword');

  if (!password) {
    password = prompt('Введите пароль администратора:');
    if (password) sessionStorage.setItem('adminPassword', password);
  }

  return password;
}

function formatSize(bytes) {
  if (bytes < 1024 * 1024) {
    return (bytes / 1024).toFixed(1) + ' КБ';
  }
  return (bytes / (1024 * 1024)).toFixed(1) + ' МБ';
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
        if (isPDF) {
          window.open('/files/' + encodeURIComponent(file.id), '_blank');
        } else {
          const url = location.origin + '/files/' + encodeURIComponent(file.id);
          const viewer = 'https://view.officeapps.live.com/op/view.aspx?src=' + encodeURIComponent(url);
          window.open(viewer, '_blank');
        }
      };

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'delete';
      deleteBtn.textContent = 'Удалить';

      deleteBtn.onclick = async () => {
        if (!confirm('Удалить презентацию "' + file.name + '"?')) return;

        const password = adminPassword();
        if (!password) return;

        const res = await fetch('/api/files/' + encodeURIComponent(file.id), {
          method: 'DELETE',
          headers: { 'x-admin-password': password }
        });

        if (res.status === 401) {
          sessionStorage.removeItem('adminPassword');
          alert('Неверный пароль');
          return;
        }

        if (!res.ok) {
          alert('Не удалось удалить файл');
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

  const password = adminPassword();
  if (!password) {
    fileInput.value = '';
    return;
  }

  const formData = new FormData();
  formData.append('presentation', file);

  statusBox.textContent = 'Загрузка файла...';
  uploadBtn.disabled = true;

  try {
    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'x-admin-password': password },
      body: formData
    });

    const data = await res.json();

    if (res.status === 401) {
      sessionStorage.removeItem('adminPassword');
      alert('Неверный пароль');
      return;
    }

    if (!res.ok) {
      throw new Error(data.error || 'Ошибка загрузки');
    }

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
