document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const browseBtn = document.querySelector('.browse-btn');
    const previewArea = document.getElementById('preview-area');
    const fileList = document.getElementById('file-list');
    const processBtn = document.getElementById('process-btn');
    const clearBtn = document.getElementById('clear-btn');
    const dropTitle = document.getElementById('drop-title');
    const dropSubtitle = document.getElementById('drop-subtitle');
    const tabBtns = document.querySelectorAll('.tab-btn');
    const progressOverlay = document.getElementById('progress-overlay');
    const themeToggle = document.getElementById('theme-toggle');
    const actionModal = document.getElementById('action-modal');
    const modalClose = document.getElementById('modal-close');
    const mergeBtn = document.querySelector('.merge-btn');
    const zipBtn = document.querySelector('.zip-btn');
    const toastContainer = document.getElementById('toast-container');

    // State
    let currentMode = 'single-image';
    let selectedFiles = [];
    let sortableInstance = null;
    let historyStack = [];
    let historyIndex = -1;

    function saveState() {
        if (historyIndex < historyStack.length - 1) {
            historyStack = historyStack.slice(0, historyIndex + 1);
        }
        historyStack.push([...selectedFiles]);
        if (historyStack.length > 20) historyStack.shift();
        historyIndex = historyStack.length - 1;
        updateUndoRedoUI();
    }

    function updateUndoRedoUI() {
        const undoBtn = document.getElementById('undo-btn');
        const redoBtn = document.getElementById('redo-btn');
        if (undoBtn) undoBtn.disabled = historyIndex <= 0;
        if (redoBtn) redoBtn.disabled = historyIndex >= historyStack.length - 1;
    }

    // Save and Load Settings automatically
    function saveSettings() {
        const config = {
            compression: document.getElementById('compression-level')?.value,
            watermarkText: document.getElementById('watermark-text')?.value,
            borderSize: document.getElementById('border-size')?.value
        };
        localStorage.setItem('mergeMintConfig', JSON.stringify(config));
    }

    function loadSettings() {
        try {
            const config = JSON.parse(localStorage.getItem('mergeMintConfig'));
            if (config) {
                if (document.getElementById('compression-level') && config.compression) document.getElementById('compression-level').value = config.compression;
                if (document.getElementById('watermark-text') && config.watermarkText) document.getElementById('watermark-text').value = config.watermarkText;
                if (document.getElementById('border-size') && config.borderSize) document.getElementById('border-size').value = config.borderSize;
            }
        } catch (e) { }
    }
    loadSettings();
    document.querySelectorAll('.options-grid input, .options-grid select').forEach(el => {
        el.addEventListener('change', saveSettings);
    });

    // Initialize Theme
    const initTheme = () => {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'light') {
            document.body.classList.remove('dark-theme');
        } else {
            document.body.classList.add('dark-theme');
        }
    };
    initTheme();

    themeToggle.addEventListener('click', () => {
        if (document.body.classList.contains('dark-theme')) {
            document.body.classList.remove('dark-theme');
            localStorage.setItem('theme', 'light');
        } else {
            document.body.classList.add('dark-theme');
            localStorage.setItem('theme', 'dark');
        }
    });

    // Tab Switching
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentMode = btn.dataset.tab;
            resetState();
            updateUIForMode();
        });
    });

    const updateUIForMode = () => {
        const optionsContainer = document.getElementById('options-container');
        if (currentMode === 'single-image') {
            fileInput.multiple = false;
            fileInput.accept = 'image/png, image/jpeg, image/webp';
            dropTitle.innerText = 'Drag & Drop an image here';
            dropSubtitle.innerText = 'or click to browse (JPG, PNG, WEBP)';
            if (optionsContainer) optionsContainer.classList.remove('hidden');
        } else if (currentMode === 'multi-image') {
            fileInput.multiple = true;
            fileInput.accept = 'image/png, image/jpeg, image/webp';
            dropTitle.innerText = 'Drag & Drop multiple images here';
            dropSubtitle.innerText = 'or click to browse (JPG, PNG, WEBP)';
            if (optionsContainer) optionsContainer.classList.remove('hidden');
        } else if (currentMode === 'merge-pdf') {
            fileInput.multiple = true;
            fileInput.accept = 'application/pdf';
            dropTitle.innerText = 'Drag & Drop PDFs here';
            dropSubtitle.innerText = 'or click to browse (PDF only)';
            if (optionsContainer) optionsContainer.classList.add('hidden');
        }
    };

    // Initialize UI
    updateUIForMode();

    // Drag and Drop Events
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.add('dragover'), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.remove('dragover'), false);
    });

    dropZone.addEventListener('drop', handleDrop, false);
    browseBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleFileSelect);

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        handleFiles(files);
    }

    function handleFileSelect(e) {
        const files = e.target.files;
        handleFiles(files);
    }

    function handleFiles(files) {
        const incomingFiles = Array.from(files);

        // Filter based on mode
        const validFiles = incomingFiles.filter(f => {
            if (currentMode.includes('image')) {
                return f.type.startsWith('image/');
            } else {
                return f.type === 'application/pdf';
            }
        });

        if (validFiles.length !== incomingFiles.length) {
            showToast('Some files were rejected due to invalid format.', 'error');
        }

        if (currentMode === 'single-image') {
            selectedFiles = validFiles.slice(0, 1);
        } else {
            selectedFiles = [...selectedFiles, ...validFiles];
        }

        saveState();
        updatePreview();
    }

    function updatePreview() {
        if (selectedFiles.length > 0) {
            previewArea.classList.remove('hidden');
            fileList.innerHTML = '';

            const fileCount = document.getElementById('file-count');
            if (fileCount) fileCount.innerText = selectedFiles.length;

            selectedFiles.forEach((f, idx) => {
                const item = document.createElement('div');
                item.className = 'file-item';
                item.dataset.idx = idx;

                let mediaHtml = '<span class="file-icon">📄</span>';
                const sizeFormat = (f.size / 1024).toFixed(1) + ' KB';
                let formatTag = f.name.split('.').pop().toUpperCase();

                if (f.type.startsWith('image/')) {
                    const url = URL.createObjectURL(f);
                    mediaHtml = `<img src="${url}" class="file-thumbnail" alt="preview" onload="window.URL.revokeObjectURL(this.src)">`;
                }

                item.innerHTML = `
                    ${mediaHtml}
                    <span class="file-index">${idx + 1}</span>
                    <span class="file-name-overlay" title="${f.name}">
                        ${f.name}<br>
                        <small style="color:#a8b2d1;">${sizeFormat} | ${formatTag}</small>
                    </span>
                    <button class="remove-file" data-idx="${idx}">&#10006;</button>
                `;
                fileList.appendChild(item);
            });

            document.querySelectorAll('.remove-file').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const i = parseInt(e.target.dataset.idx, 10);
                    selectedFiles.splice(i, 1);
                    saveState();
                    updatePreview();
                });
            });

            // Initialize SortableJS
            if (sortableInstance) sortableInstance.destroy();
            sortableInstance = new Sortable(fileList, {
                animation: 150,
                ghostClass: 'sortable-ghost',
                onEnd: function (evt) {
                    const oldIndex = evt.oldIndex;
                    const newIndex = evt.newIndex;
                    if (oldIndex === newIndex) return;

                    const movedItem = selectedFiles.splice(oldIndex, 1)[0];
                    selectedFiles.splice(newIndex, 0, movedItem);
                    saveState();
                    updatePreview();
                }
            });
        } else {
            previewArea.classList.add('hidden');
            const fileCount = document.getElementById('file-count');
            if (fileCount) fileCount.innerText = "0";
        }
    }

    function resetState() {
        selectedFiles = [];
        fileInput.value = '';
        updatePreview();

        // Reset advanced options if present
        const bgCheck = document.getElementById('bg-replace-check');
        if (bgCheck) {
            bgCheck.checked = false;
            document.getElementById('bg-color-picker').disabled = true;
            document.getElementById('bg-color-picker').value = '#ffffff';
            document.getElementById('border-size').value = 0;
            document.getElementById('border-color').value = '#000000';
            document.getElementById('crop-x').value = '';
            document.getElementById('crop-y').value = '';
            document.getElementById('crop-w').value = '';
            document.getElementById('crop-h').value = '';
            document.getElementById('watermark-text').value = '';
            document.getElementById('watermark-pos').value = 'center';
            document.getElementById('watermark-opacity').value = 128;
            document.getElementById('compression-level').value = 'none';
            document.getElementById('filter-type').value = 'none';
        }
    }

    clearBtn.addEventListener('click', resetState);

    // Processing Logic
    processBtn.addEventListener('click', () => {
        if (selectedFiles.length === 0) return;

        if (currentMode === 'multi-image' && selectedFiles.length > 1) {
            actionModal.classList.remove('hidden');
        } else {
            processAPIRequest();
        }
    });

    // Modal Events
    modalClose.addEventListener('click', () => actionModal.classList.add('hidden'));

    mergeBtn.addEventListener('click', () => {
        actionModal.classList.add('hidden');
        processAPIRequest('merge');
    });

    zipBtn.addEventListener('click', () => {
        actionModal.classList.add('hidden');
        processAPIRequest('zip');
    });

    const BASE_URL = window.location.hostname.includes("localhost")
        ? "http://localhost:10000"
        : "https://mergemint.onrender.com";

    async function processAPIRequest(action = null, isPreview = false) {
        progressOverlay.classList.remove('hidden');
        const formData = new FormData();

        if (currentMode !== 'merge-pdf') {
            const config = {
                bgReplace: document.getElementById('bg-replace-check')?.checked,
                bgColor: document.getElementById('bg-color-picker')?.value,
                borderSize: document.getElementById('border-size')?.value,
                borderColor: document.getElementById('border-color')?.value,
                crop: {
                    x: document.getElementById('crop-x')?.value,
                    y: document.getElementById('crop-y')?.value,
                    w: document.getElementById('crop-w')?.value,
                    h: document.getElementById('crop-h')?.value
                },
                watermark: {
                    text: document.getElementById('watermark-text')?.value,
                    pos: document.getElementById('watermark-pos')?.value,
                    opacity: document.getElementById('watermark-opacity')?.value
                },
                compression: document.getElementById('compression-level')?.value,
                filterType: document.getElementById('filter-type')?.value,
                pageSettings: {
                    size: document.getElementById('page-size')?.value,
                    orientation: document.getElementById('page-orientation')?.value,
                    alignment: document.getElementById('page-align')?.value,
                    margin: document.getElementById('page-margin')?.value
                },
                pageNumbering: {
                    enabled: document.getElementById('page-num-check')?.checked,
                    position: document.getElementById('page-num-pos')?.value
                }
            };
            formData.append('config', JSON.stringify(config));
        }

        let endpoint = '';
        if (currentMode === 'single-image') {
            endpoint = `${BASE_URL}/api/convert/single-image`;
            formData.append('file', selectedFiles[0]);
        } else if (currentMode === 'multi-image') {
            endpoint = `${BASE_URL}/api/convert/multi-image`;
            selectedFiles.forEach(f => formData.append('files[]', f));
            if (action) formData.append('action', action);
        } else if (currentMode === 'merge-pdf') {
            endpoint = `${BASE_URL}/api/convert/merge-pdf`;
            selectedFiles.forEach(f => formData.append('files[]', f));
        }

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Conversion failed');
            }

            // Extract filename from headers if possible
            const disposition = response.headers.get('Content-Disposition');
            let filename = 'download';
            if (disposition && disposition.indexOf('attachment') !== -1) {
                var filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
                var matches = filenameRegex.exec(disposition);
                if (matches != null && matches[1]) {
                    filename = matches[1].replace(/['"]/g, '');
                }
            }

            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);

            if (isPreview) {
                const modal = document.getElementById('universal-modal');
                const modalBody = document.getElementById('univ-modal-body');
                if (modal && modalBody) {
                    modalBody.innerHTML = `<iframe src="${downloadUrl}" style="width:100%; height:80vh; border:none; border-radius:8px;"></iframe>`;
                    modal.classList.remove('hidden');
                }
            } else {
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = downloadUrl;
                a.download = filename;
                document.body.appendChild(a);
                a.click();

                // Add to Download History
                const historyList = document.getElementById('history-list');
                const historyContainer = document.getElementById('download-history');
                if (historyList && historyContainer) {
                    historyContainer.classList.remove('hidden');
                    const li = document.createElement('li');
                    li.innerHTML = `<a href="${downloadUrl}" download="${filename}">⬇️ ${filename}</a>`;
                    historyList.prepend(li);
                    // Keep last 5
                    if (historyList.children.length > 5) historyList.lastChild.remove();
                } else {
                    window.URL.revokeObjectURL(downloadUrl);
                }

                a.remove();
                showToast('File processed successfully!', 'success');
                resetState();
            }
        } catch (error) {
            console.error(error);
            showToast(error.message, 'error');
        } finally {
            progressOverlay.classList.add('hidden');
        }
    }

    // Tools
    function showToast(message, type) {
        const t = document.createElement('div');
        t.className = `toast ${type}`;
        t.innerText = message;
        toastContainer.appendChild(t);
        setTimeout(() => t.remove(), 3000);
    }

    // UI Events for Options
    const bgCheck = document.getElementById('bg-replace-check');
    if (bgCheck) {
        bgCheck.addEventListener('change', (e) => {
            document.getElementById('bg-color-picker').disabled = !e.target.checked;
        });
    }

    const pageNumCheck = document.getElementById('page-num-check');
    if (pageNumCheck) {
        pageNumCheck.addEventListener('change', (e) => {
            document.getElementById('page-num-pos').disabled = !e.target.checked;
        });
    }

    // New Hooks
    const previewPdfBtn = document.getElementById('preview-pdf-btn');
    if (previewPdfBtn) {
        previewPdfBtn.addEventListener('click', () => {
            if (selectedFiles.length === 0) return;
            // Bypass to universal modal
            if (currentMode === 'multi-image' && selectedFiles.length > 1) {
                processAPIRequest('merge', true);
            } else {
                processAPIRequest(null, true);
            }
        });
    }

    const smartOptBtn = document.getElementById('smart-optimize-btn');
    if (smartOptBtn) {
        smartOptBtn.addEventListener('click', () => {
            if (document.getElementById('compression-level')) document.getElementById('compression-level').value = 'high';
            if (document.getElementById('filter-type')) document.getElementById('filter-type').value = 'contrast';
            if (document.getElementById('page-size')) document.getElementById('page-size').value = 'auto';
            saveSettings();
            showToast('Smart Optimization Applied!', 'success');
        });
    }

    const autoArrangeBtn = document.getElementById('auto-arrange-btn');
    if (autoArrangeBtn) {
        autoArrangeBtn.addEventListener('click', () => {
            if (selectedFiles.length > 1) {
                selectedFiles.sort((a, b) => a.name.localeCompare(b.name));
                saveState();
                updatePreview();
                showToast('Files arranged alphabetically.', 'success');
            }
        });
    }

    const undoBtn = document.getElementById('undo-btn');
    if (undoBtn) {
        undoBtn.addEventListener('click', () => {
            if (historyIndex > 0) {
                historyIndex--;
                selectedFiles = [...historyStack[historyIndex]];
                updatePreview();
                updateUndoRedoUI();
            }
        });
    }

    const redoBtn = document.getElementById('redo-btn');
    if (redoBtn) {
        redoBtn.addEventListener('click', () => {
            if (historyIndex < historyStack.length - 1) {
                historyIndex++;
                selectedFiles = [...historyStack[historyIndex]];
                updatePreview();
                updateUndoRedoUI();
            }
        });
    }

    const univModalClose = document.getElementById('univ-modal-close');
    if (univModalClose) {
        univModalClose.addEventListener('click', () => {
            document.getElementById('universal-modal').classList.add('hidden');
            document.getElementById('univ-modal-body').innerHTML = '';
        });
    }

    if (fileList) {
        fileList.addEventListener('click', (e) => {
            if (e.target.classList.contains('file-thumbnail')) {
                const modal = document.getElementById('universal-modal');
                const modalBody = document.getElementById('univ-modal-body');
                if (modal && modalBody) {
                    modalBody.innerHTML = `<img src="${e.target.src}" style="width:100%; height:auto; border-radius:8px; object-fit:contain; max-height:80vh;">`;
                    modal.classList.remove('hidden');
                }
            }
        });
    }
});
