(() => {
  'use strict';

  const storageKey = 'daniela-primavera-carta-v1';
  const fields = [...document.querySelectorAll('[data-letter-field]')];
  const slots = [...document.querySelectorAll('[data-slot]')];
  const rows = [...document.querySelectorAll('[data-row]')];
  const byId = id => document.getElementById(id);
  const status = byId('draft-status');
  const dialog = byId('drawing-dialog');
  const canvas = byId('drawing-canvas');
  const context = canvas.getContext('2d');
  const downloadButton = byId('download-gift');
  const defaultFields = Object.fromEntries(fields.map(field => [field.dataset.letterField, field.textContent]));
  let saveTimer;
  let toastTimer;
  let editing = false;
  let activeSlot = 0;
  let pointer = null;
  let penColor = '#344b35';
  let history = [];
  let imageLoading = false;
  let imageRevision = 0;
  let preparedGiftUrl = null;

  function makeLayout(previous) {
    const sides = Math.random() > .5 ? ['left', 'right', 'right'] : ['right', 'left', 'left'];
    return sides.map((side, index) => ({
      side: previous && previous.every((item, i) => item.side === sides[i]) ? (side === 'left' ? 'right' : 'left') : side,
      rotation: Math.round(Math.random() * 12 - 6),
      offset: Math.round(Math.random() * 15 + 2)
    }));
  }

  function sanitizeState(input) {
    const result = { version: 1, fields: { ...defaultFields }, drawings: ['', '', ''], layout: makeLayout() };
    if (!input || typeof input !== 'object' || input.version !== 1) return result;
    fields.forEach(field => {
      const key = field.dataset.letterField;
      if (typeof input.fields?.[key] === 'string') result.fields[key] = input.fields[key].slice(0, Number(field.dataset.maxLength));
    });
    if (Array.isArray(input.drawings)) result.drawings = result.drawings.map((_, index) => {
      const value = input.drawings[index];
      return typeof value === 'string' && value.length < 1800000 && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value) ? value : '';
    });
    if (Array.isArray(input.layout) && input.layout.length === 3) result.layout = input.layout.map((item, i) => ({
      side: item?.side === 'left' ? 'left' : 'right',
      rotation: Number.isFinite(item?.rotation) ? Math.min(8, Math.max(-8, item.rotation)) : result.layout[i].rotation,
      offset: Number.isFinite(item?.offset) ? Math.min(20, Math.max(2, item.offset)) : result.layout[i].offset
    }));
    return result;
  }

  let embedded = null;
  try { embedded = JSON.parse(byId('gift-data').textContent); } catch { /* The default letter is still usable. */ }
  const isGift = embedded?.mode === 'gift';
  let saved = null;
  let storageAvailable = true;
  if (!isGift) {
    try { saved = JSON.parse(localStorage.getItem(storageKey)); }
    catch { storageAvailable = false; }
  }
  let state = sanitizeState(isGift ? embedded : saved);

  function renderLayout() {
    rows.forEach((row, index) => {
      row.dataset.side = state.layout[index].side;
      slots[index].style.setProperty('--rotation', `${state.layout[index].rotation}deg`);
      slots[index].style.marginTop = `${state.layout[index].offset}px`;
    });
  }

  function renderDrawings() {
    slots.forEach((slot, index) => {
      const picture = slot.querySelector('img');
      const drawing = state.drawings[index];
      picture.hidden = !drawing;
      if (drawing) picture.src = drawing;
      else picture.removeAttribute('src');
      slot.querySelector('.doodle-placeholder').hidden = Boolean(drawing);
      slot.classList.toggle('has-drawing', Boolean(drawing));
      slot.setAttribute('aria-label', `${drawing ? 'Editar' : 'Añadir'} dibujo en el ${['primer', 'segundo', 'tercer'][index]} espacio`);
    });
  }

  function renderFields() {
    fields.forEach(field => { field.textContent = state.fields[field.dataset.letterField]; });
  }

  function readFields() {
    fields.forEach(field => {
      state.fields[field.dataset.letterField] = field.innerText.replace(/\r\n/g, '\n').slice(0, Number(field.dataset.maxLength));
    });
  }

  function notify(message) {
    clearTimeout(toastTimer);
    byId('toast').textContent = message;
    byId('toast').hidden = false;
    toastTimer = setTimeout(() => { byId('toast').hidden = true; }, 4500);
  }

  function persist() {
    if (isGift) return true;
    clearTimeout(saveTimer);
    saveTimer = null;
    if (preparedGiftUrl) {
      URL.revokeObjectURL(preparedGiftUrl);
      preparedGiftUrl = null;
      byId('save-gift-file').hidden = true;
      byId('save-gift-file').removeAttribute('href');
    }
    readFields();
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
      storageAvailable = true;
      status.textContent = 'Borrador guardado en este dispositivo. Descárgalo cuando esté listo para Daniela.';
      byId('local-note').textContent = 'Tu borrador se guarda solo en este dispositivo.';
      return true;
    } catch {
      storageAvailable = false;
      const message = 'No se pudo guardar en este dispositivo. Descarga la carta para conservarla.';
      status.textContent = message;
      byId('local-note').textContent = message;
      return false;
    }
  }

  function setEditing(enabled, focus = false) {
    if (isGift) return;
    editing = enabled;
    document.body.classList.toggle('is-editing', enabled);
    byId('edit-toolbar').hidden = !enabled;
    fields.forEach(field => {
      if (enabled) {
        field.setAttribute('contenteditable', 'plaintext-only');
        field.setAttribute('role', 'textbox');
        field.setAttribute('aria-multiline', 'true');
      } else {
        field.removeAttribute('contenteditable');
        field.removeAttribute('role');
        field.removeAttribute('aria-multiline');
      }
    });
    byId('edit-top').setAttribute('aria-pressed', String(enabled));
    if (focus) {
      byId('edit-toolbar').scrollIntoView({ behavior: 'smooth', block: 'start' });
      fields[0].focus({ preventScroll: true });
    }
  }

  renderFields();
  renderLayout();
  renderDrawings();
  if (isGift) {
    document.body.classList.add('is-gift');
    slots.forEach(slot => { slot.disabled = true; slot.tabIndex = -1; });
    return;
  }
  if (saved) status.textContent = 'Tu borrador está aquí, tal como lo dejaste.';
  if (!storageAvailable) status.textContent = 'El guardado local no está disponible. Puedes descargar tu carta para conservarla.';

  byId('edit-top').addEventListener('click', () => setEditing(true, true));
  byId('edit-letter').addEventListener('click', () => setEditing(true, true));
  byId('finish-edit').addEventListener('click', () => {
    const success = persist();
    setEditing(false);
    byId('letter-heading').scrollIntoView({ behavior: 'smooth', block: 'start' });
    notify(success ? 'Tus palabras y dibujos quedaron guardados en este dispositivo ♡' : 'Descarga tu carta para conservar los cambios.');
  });
  fields.forEach(field => {
    field.addEventListener('input', () => {
      const maximum = Number(field.dataset.maxLength);
      if (field.innerText.length > maximum) {
        field.textContent = field.innerText.slice(0, maximum);
        notify(`Este espacio admite hasta ${maximum} caracteres.`);
      }
      status.textContent = 'Guardando tus palabras…';
      clearTimeout(saveTimer);
      saveTimer = setTimeout(persist, 450);
    });
    field.addEventListener('paste', event => {
      event.preventDefault();
      const text = event.clipboardData.getData('text/plain');
      const selection = window.getSelection();
      if (!selection?.rangeCount) return;
      const range = selection.getRangeAt(0);
      if (!field.contains(range.commonAncestorContainer)) return;
      const allowed = Number(field.dataset.maxLength) - field.innerText.length + selection.toString().length;
      const node = document.createTextNode(text.slice(0, Math.max(0, allowed)));
      range.deleteContents(); range.insertNode(node); range.setStartAfter(node); range.collapse(true);
      selection.removeAllRanges(); selection.addRange(range);
      field.dispatchEvent(new Event('input', { bubbles: true }));
    });
  });
  window.addEventListener('pagehide', () => { if (saveTimer) persist(); });
  byId('shuffle').addEventListener('click', () => {
    state.layout = makeLayout(state.layout);
    renderLayout(); persist();
    notify('Los espacios encontraron un nuevo lugar.');
  });

  function updateUndo() { byId('undo-drawing').disabled = !history.length || imageLoading; }
  function pushHistory() {
    history.push(context.getImageData(0, 0, canvas.width, canvas.height));
    if (history.length > 20) history.shift();
    updateUndo();
  }
  function setImageLoading(value) {
    imageLoading = value;
    byId('save-drawing').disabled = value;
    byId('clear-drawing').disabled = value;
    byId('choose-image').disabled = value;
    updateUndo();
  }
  function restoreImage(source, fitted = false) {
    const revision = ++imageRevision;
    setImageLoading(true);
    return new Promise(resolve => {
      const picture = new Image();
      picture.onload = () => {
        if (revision !== imageRevision) { resolve(false); return; }
        context.clearRect(0, 0, canvas.width, canvas.height);
        if (fitted) {
          const scale = Math.min(canvas.width / picture.naturalWidth, canvas.height / picture.naturalHeight);
          const w = picture.naturalWidth * scale, h = picture.naturalHeight * scale;
          context.drawImage(picture, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
        } else context.drawImage(picture, 0, 0, canvas.width, canvas.height);
        setImageLoading(false); resolve(true);
      };
      picture.onerror = () => {
        if (revision === imageRevision) {
          setImageLoading(false);
          byId('drawing-status').textContent = 'No se pudo abrir la imagen. Prueba con un archivo PNG, JPG o WebP.';
        }
        resolve(false);
      };
      picture.src = source;
    });
  }
  function openDrawing(index) {
    if (!editing) setEditing(true);
    activeSlot = index;
    pointer = null;
    history = [];
    imageRevision++;
    setImageLoading(false);
    context.clearRect(0, 0, canvas.width, canvas.height);
    byId('drawing-status').textContent = '';
    byId('drawing-file').value = '';
    dialog.showModal();
    document.body.classList.add('dialog-open');
    if (state.drawings[index]) restoreImage(state.drawings[index]);
  }
  slots.forEach((slot, index) => slot.addEventListener('click', () => openDrawing(index)));
  byId('close-drawing').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    imageRevision++;
    pointer = null;
    document.body.classList.remove('dialog-open');
    slots[activeSlot].focus({ preventScroll: true });
  });
  document.querySelectorAll('[data-color]').forEach(button => button.addEventListener('click', () => {
    penColor = button.dataset.color;
    document.querySelectorAll('[data-color]').forEach(option => {
      const selected = option === button;
      option.classList.toggle('selected', selected);
      option.setAttribute('aria-pressed', String(selected));
    });
  }));
  function point(event) {
    const box = canvas.getBoundingClientRect();
    return { x: (event.clientX - box.left) * canvas.width / box.width, y: (event.clientY - box.top) * canvas.height / box.height };
  }
  canvas.addEventListener('pointerdown', event => {
    if (imageLoading || pointer !== null || event.button !== 0) return;
    event.preventDefault();
    pushHistory();
    pointer = event.pointerId;
    canvas.setPointerCapture(pointer);
    const position = point(event);
    context.strokeStyle = penColor;
    context.fillStyle = penColor;
    context.lineWidth = 4.5;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.beginPath(); context.arc(position.x, position.y, 2.25, 0, 2 * Math.PI); context.fill();
    context.beginPath(); context.moveTo(position.x, position.y);
  });
  canvas.addEventListener('pointermove', event => {
    if (event.pointerId !== pointer) return;
    event.preventDefault();
    const position = point(event);
    context.lineTo(position.x, position.y); context.stroke();
  });
  function endStroke(event) {
    if (event.pointerId !== pointer) return;
    if (canvas.hasPointerCapture(pointer)) canvas.releasePointerCapture(pointer);
    pointer = null;
    context.closePath();
  }
  canvas.addEventListener('pointerup', endStroke);
  canvas.addEventListener('pointercancel', endStroke);
  canvas.addEventListener('lostpointercapture', () => { pointer = null; });
  byId('undo-drawing').addEventListener('click', () => {
    if (history.length && !imageLoading) context.putImageData(history.pop(), 0, 0);
    updateUndo();
  });
  byId('clear-drawing').addEventListener('click', () => {
    pushHistory(); context.clearRect(0, 0, canvas.width, canvas.height);
  });
  byId('choose-image').addEventListener('click', () => byId('drawing-file').click());
  byId('drawing-file').addEventListener('change', async event => {
    const file = event.target.files[0];
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 8 * 1024 * 1024) {
      byId('drawing-status').textContent = 'Elige un PNG, JPG o WebP de hasta 8 MB.';
      event.target.value = ''; return;
    }
    const source = URL.createObjectURL(file);
    pushHistory();
    byId('drawing-status').textContent = '';
    await restoreImage(source, true);
    URL.revokeObjectURL(source);
    event.target.value = '';
  });
  byId('save-drawing').addEventListener('click', () => {
    if (imageLoading) return;
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let hasInk = false;
    for (let i = 3; i < pixels.length; i += 4) if (pixels[i]) { hasInk = true; break; }
    state.drawings[activeSlot] = hasInk ? canvas.toDataURL('image/png') : '';
    renderDrawings();
    const success = persist();
    dialog.close();
    notify(success ? 'Un pedacito de ti, añadido a la carta ♡' : 'Dibujo añadido. Descarga la carta para conservarlo.');
  });

  async function asDataUrl(url) {
    if (url.startsWith('data:')) return url;
    const response = await fetch(url);
    if (!response.ok) throw new Error('No se pudo preparar una imagen.');
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('No se pudo leer una imagen.'));
      reader.readAsDataURL(blob);
    });
  }

  downloadButton.addEventListener('click', async () => {
    readFields(); persist();
    downloadButton.disabled = true;
    downloadButton.textContent = 'Preparando tu regalo…';
    try {
      const clone = document.documentElement.cloneNode(true);
      clone.querySelector('body').className = 'is-gift';
      clone.querySelectorAll('.editor-only, dialog, #toast').forEach(element => element.remove());
      clone.querySelectorAll('[contenteditable]').forEach(element => {
        element.removeAttribute('contenteditable'); element.removeAttribute('role'); element.removeAttribute('aria-multiline');
      });
      // The exported gift is entirely static: no editor, executable script, or local draft access.
      clone.querySelectorAll('script').forEach(element => element.remove());
      clone.querySelectorAll('.doodle-slot').forEach(element => {
        const drawing = element.querySelector('img');
        const container = document.createElement('span');
        container.className = element.className;
        container.setAttribute('style', element.getAttribute('style') || '');
        if (drawing && !drawing.hidden) container.append(drawing.cloneNode(true));
        element.replaceWith(container);
      });
      const stylesheet = clone.querySelector('link[href="styles.css"]');
      const response = await fetch(new URL('styles.css', document.baseURI));
      if (!response.ok) throw new Error('No se pudo preparar el diseño.');
      const css = document.createElement('style'); css.textContent = await response.text();
      stylesheet.replaceWith(css);
      await Promise.all([...clone.querySelectorAll('img[src]')].map(async picture => {
        picture.src = await asDataUrl(new URL(picture.getAttribute('src'), document.baseURI).href);
      }));
      const blob = new Blob(['<!doctype html>\n' + clone.outerHTML], { type: 'text/html;charset=utf-8' });
      if (preparedGiftUrl) URL.revokeObjectURL(preparedGiftUrl);
      preparedGiftUrl = URL.createObjectURL(blob);
      const anchor = byId('save-gift-file');
      anchor.href = preparedGiftUrl; anchor.hidden = false; anchor.click();
      notify('Archivo preparado. Si no se descargó, pulsa «Guardar archivo preparado».');
    } catch {
      notify('No pudimos preparar el regalo. Abre la vista previa de la página y vuelve a intentarlo.');
    } finally {
      downloadButton.disabled = false;
      downloadButton.textContent = 'Descargar para Daniela ↓';
    }
  });

  // Optional browser integration; both actions reuse the visible editor and local draft.
  const modelContext = document.modelContext;
  if (modelContext?.registerTool) {
    const lifecycle = new AbortController();
    const tools = [{
      name: 'read_letter_draft',
      title: 'Leer el borrador de la carta',
      description: 'Lee las palabras visibles de la carta para Daniela, la ubicación de los tres espacios y cuáles tienen dibujo. No modifica ni publica nada.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute(input) {
        if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).length) throw new Error('No se admiten parámetros.');
        const visibleFields = Object.fromEntries(fields.map(field => [field.dataset.letterField, field.innerText]));
        return { fields: visibleFields, drawingsPresent: state.drawings.map(Boolean), layout: state.layout, storage: 'device-local' };
      }
    }, {
      name: 'update_letter_draft',
      title: 'Actualizar el borrador de la carta',
      description: 'Actualiza uno o varios textos de la carta para Daniela y guarda solo en este dispositivo. No envía ni publica la carta.',
      inputSchema: { type: 'object', properties: { fields: { type: 'object', minProperties: 1, properties: Object.fromEntries(fields.map(field => [field.dataset.letterField, { type: 'string', maxLength: Number(field.dataset.maxLength) }])), additionalProperties: false } }, required: ['fields'], additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input) {
        if (!input || typeof input !== 'object' || Object.keys(input).some(key => key !== 'fields') || !input.fields || typeof input.fields !== 'object' || Array.isArray(input.fields) || !Object.keys(input.fields).length) throw new Error('Indica al menos un texto válido.');
        for (const [key, value] of Object.entries(input.fields)) {
          const field = fields.find(item => item.dataset.letterField === key);
          if (!field || typeof value !== 'string' || value.length > Number(field.dataset.maxLength)) throw new Error('Campo desconocido o texto demasiado largo.');
        }
        readFields(); Object.assign(state.fields, input.fields); renderFields(); setEditing(true);
        return { updated: Object.keys(input.fields), savedOnDevice: persist(), published: false };
      }
    }];
    tools.forEach(tool => {
      try { Promise.resolve(modelContext.registerTool(tool, { signal: lifecycle.signal })).catch(() => {}); } catch { /* Optional browser API. */ }
    });
    window.addEventListener('pagehide', () => lifecycle.abort(), { once: true });
  }
})();
