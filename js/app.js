/**
 * Consolidador de Macrodados - Main Application Controller
 * Orchestrates navigation, file processing, column matching, manual association/overwrite modal,
 * business rules execution (CHP / IFTP categories & 13 columns), and UI rendering.
 */

import { ModelRegistry } from './models/model-registry.js';
import { FileReaderService } from './services/file-reader.js';
import { ColumnMatcher } from './services/column-matcher.js';
import { ExporterService } from './services/exporter.js';
import { DemoDataService } from './services/demo-data.js';

class App {
  constructor() {
    this.currentStep = 1;
    this.selectedModelId = 'prova-objetiva';
    this.loadedFiles = {
      aptos: null,
      matriculados_chp: null,
      matriculados_iftp: null,
      participacao: null
    };
    this.macroResult = null;
    this.filterQuery = '';

    // Active modal picker state
    this.pickerState = {
      roleKey: null,
      fieldKey: null,
      selectedColumn: null
    };

    this.initElements();
    this.bindEvents();
    this.renderStep(1);
    this.renderFileCards();
  }

  /**
   * Cache DOM elements
   */
  initElements() {
    // Stepper navigation
    this.stepperNav = document.getElementById('stepperNav');
    this.stepBtns = [1, 2, 3, 4].map((i) => document.getElementById(`stepBtn${i}`));
    this.stepDividers = [1, 2, 3].map((i) => document.getElementById(`stepDiv${i}`));
    this.stepViews = [1, 2, 3, 4].map((i) => document.getElementById(`stepView${i}`));

    // Step 1 Elements
    this.cardModelObjetiva = document.getElementById('cardModelObjetiva');
    this.cardModelPratica = document.getElementById('cardModelPratica');
    this.btnStep1Next = document.getElementById('btnStep1Next');

    // Step 2 Elements
    this.dropzone = document.getElementById('dropzone');
    this.fileInput = document.getElementById('fileInput');
    this.filesGridContainer = document.getElementById('filesGridContainer');
    this.btnLoadDemoData = document.getElementById('btnLoadDemoData');
    this.btnStep2Back = document.getElementById('btnStep2Back');
    this.btnStep2Next = document.getElementById('btnStep2Next');
    this.activeModelBadge = document.getElementById('activeModelBadge');

    // Step 3 Elements
    this.mappingTablesContainer = document.getElementById('mappingTablesContainer');
    this.mappingStatusSummary = document.getElementById('mappingStatusSummary');
    this.btnStep3Back = document.getElementById('btnStep3Back');
    this.btnProcessMacro = document.getElementById('btnProcessMacro');

    // Modal Picker Elements
    this.modalColumnPicker = document.getElementById('modalColumnPicker');
    this.modalPickerTitle = document.getElementById('modalPickerTitle');
    this.modalPickerSubtitle = document.getElementById('modalPickerSubtitle');
    this.modalPickerBody = document.getElementById('modalPickerBody');
    this.btnModalClose = document.getElementById('btnModalClose');
    this.btnModalCancel = document.getElementById('btnModalCancel');
    this.btnModalConfirm = document.getElementById('btnModalConfirm');

    // Step 4 Elements
    this.kpiGridContainer = document.getElementById('kpiGridContainer');
    this.warningsContainer = document.getElementById('warningsContainer');
    this.macroTableHeaderRow = document.getElementById('macroTableHeaderRow');
    this.macroTableBody = document.getElementById('macroTableBody');
    this.tableSearchInput = document.getElementById('tableSearchInput');
    this.tableRowCountLabel = document.getElementById('tableRowCountLabel');
    this.btnExportXLSX = document.getElementById('btnExportXLSX');
    this.btnExportCSV = document.getElementById('btnExportCSV');
    this.btnStep4Back = document.getElementById('btnStep4Back');
    this.btnNewConversion = document.getElementById('btnNewConversion');
    this.btnHeaderReset = document.getElementById('btnHeaderReset');
  }

  /**
   * Bind DOM event listeners
   */
  bindEvents() {
    // Header Reset
    this.btnHeaderReset.addEventListener('click', () => this.resetAll());

    // Step 1: Model Selection
    this.cardModelObjetiva.addEventListener('click', () => this.selectModel('prova-objetiva'));
    this.cardModelPratica.addEventListener('click', () => {
      alert('O modelo Prova Prática está planejado para a Fase 2. No momento, o Consolidador opera com a Prova Objetiva.');
    });
    this.btnStep1Next.addEventListener('click', () => this.goToStep(2));

    // Stepper Navigation clicks
    this.stepBtns.forEach((btn, idx) => {
      btn.addEventListener('click', () => {
        if (!btn.disabled) {
          this.goToStep(idx + 1);
        }
      });
    });

    // Step 2: Upload Dropzone
    this.dropzone.addEventListener('click', () => this.fileInput.click());
    this.fileInput.addEventListener('change', (e) => this.handleFilesSelected(e.target.files));

    // Drag & Drop events
    ['dragenter', 'dragover'].forEach((eventName) => {
      this.dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.dropzone.classList.add('dragover');
      });
    });

    ['dragleave', 'drop'].forEach((eventName) => {
      this.dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.dropzone.classList.remove('dragover');
      });
    });

    this.dropzone.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      const files = dt.files;
      if (files && files.length > 0) {
        this.handleFilesSelected(files);
      }
    });

    // Demo Data Button
    this.btnLoadDemoData.addEventListener('click', () => this.loadDemoData());

    // Step 2 Nav
    this.btnStep2Back.addEventListener('click', () => this.goToStep(1));
    this.btnStep2Next.addEventListener('click', () => {
      this.prepareColumnMapping();
      this.goToStep(3);
    });

    // Step 3 Nav & Modal Events
    this.btnStep3Back.addEventListener('click', () => this.goToStep(2));
    this.btnProcessMacro.addEventListener('click', () => this.processMacroAndShowPreview());

    // Modal Picker controls
    this.btnModalClose.addEventListener('click', () => this.closeColumnPicker());
    this.btnModalCancel.addEventListener('click', () => this.closeColumnPicker());
    this.btnModalConfirm.addEventListener('click', () => this.confirmColumnPicker());

    this.modalColumnPicker.addEventListener('click', (e) => {
      if (e.target === this.modalColumnPicker) {
        this.closeColumnPicker();
      }
    });

    // Step 4 Nav & Exports
    this.tableSearchInput.addEventListener('input', (e) => {
      this.filterQuery = e.target.value.trim().toLowerCase();
      this.renderPreviewTableRows();
    });

    this.btnExportXLSX.addEventListener('click', () => this.exportXLSX());
    this.btnExportCSV.addEventListener('click', () => this.exportCSV());
    this.btnStep4Back.addEventListener('click', () => this.goToStep(3));
    this.btnNewConversion.addEventListener('click', () => this.resetAll());
  }

  /**
   * Model selector handler
   */
  selectModel(modelId) {
    this.selectedModelId = modelId;
    this.cardModelObjetiva.classList.toggle('selected', modelId === 'prova-objetiva');
    this.cardModelPratica.classList.toggle('selected', modelId === 'prova-pratica');
    const model = ModelRegistry.getModelById(modelId);
    if (model) {
      this.activeModelBadge.textContent = `Modelo Ativo: ${model.name}`;
    }
  }

  /**
   * Navigation to step
   */
  goToStep(stepNumber) {
    this.currentStep = stepNumber;
    this.renderStep(stepNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  renderStep(stepNumber) {
    this.stepViews.forEach((view, idx) => {
      if (view) {
        view.classList.toggle('active', idx + 1 === stepNumber);
      }
    });

    this.stepBtns.forEach((btn, idx) => {
      const stepIdx = idx + 1;
      btn.classList.remove('active', 'completed');
      if (stepIdx === stepNumber) {
        btn.classList.add('active');
        btn.disabled = false;
      } else if (stepIdx < stepNumber) {
        btn.classList.add('completed');
        btn.disabled = false;
      } else {
        if (stepIdx === 2 && this.selectedModelId) {
          btn.disabled = false;
        } else if (stepIdx === 3 && this.isStep2Complete()) {
          btn.disabled = false;
        } else if (stepIdx === 4 && this.macroResult) {
          btn.disabled = false;
        } else {
          btn.disabled = true;
        }
      }
    });

    this.stepDividers.forEach((div, idx) => {
      div.classList.toggle('filled', idx + 1 < stepNumber);
    });
  }

  /**
   * Checks if Step 2 requirements are fulfilled (Aptos + Matriculados CHP + Matriculados IFTP)
   */
  isStep2Complete() {
    return !!(this.loadedFiles.aptos && this.loadedFiles.matriculados_chp && this.loadedFiles.matriculados_iftp);
  }

  /**
   * Handle multiple files dropped or chosen
   */
  async handleFilesSelected(fileList) {
    if (!fileList || fileList.length === 0) return;

    const model = ModelRegistry.getModelById(this.selectedModelId);
    const unassignedFiles = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      try {
        const role = model.identifyFileRole(file.name);
        const parsed = await FileReaderService.readFile(file, role);

        const filePayload = {
          file,
          fileName: parsed.fileName,
          fileSize: parsed.fileSize,
          sheetName: parsed.primarySheet.name,
          headers: parsed.primarySheet.headers,
          rows: parsed.primarySheet.rows,
          parsedSheets: parsed.sheets,
          mappings: {},
          manualOverrides: {},
          isManualMapped: {}
        };

        if (role) {
          this.loadedFiles[role] = filePayload;
        } else {
          const lowerName = file.name.toLowerCase();
          if (lowerName.includes('matriculado') && !lowerName.includes('chp') && !lowerName.includes('iftp')) {
            alert(`O arquivo "${file.name}" é de Matriculados, mas precisa indicar a categoria no nome (ex: "matriculados chp.xlsx" ou "matriculados iftp.xlsx").`);
          }
          unassignedFiles.push(filePayload);
        }
      } catch (err) {
        alert(`Erro ao processar "${file.name}": ${err.message}`);
      }
    }

    // Helper to assign unassigned file to a role and select optimal sheet
    const assignUnassigned = (roleKey, payload) => {
      if (payload.parsedSheets && payload.parsedSheets.length > 1) {
        const best = FileReaderService.findBestSheet(payload.parsedSheets, roleKey);
        payload.sheetName = best.name;
        payload.headers = best.headers;
        payload.rows = best.rows;
      }
      this.loadedFiles[roleKey] = payload;
    };

    // If there were unassigned files, try assigning to first missing required slot
    if (unassignedFiles.length > 0) {
      if (!this.loadedFiles.aptos && unassignedFiles.length > 0) {
        assignUnassigned('aptos', unassignedFiles.shift());
      }
      if (!this.loadedFiles.matriculados_chp && unassignedFiles.length > 0) {
        assignUnassigned('matriculados_chp', unassignedFiles.shift());
      }
      if (!this.loadedFiles.matriculados_iftp && unassignedFiles.length > 0) {
        assignUnassigned('matriculados_iftp', unassignedFiles.shift());
      }
      if (!this.loadedFiles.participacao && unassignedFiles.length > 0) {
        assignUnassigned('participacao', unassignedFiles.shift());
      }
    }

    this.fileInput.value = '';
    this.renderFileCards();
    this.updateStep2NextButton();
  }

  /**
   * Loads sample mock data for 1-click test
   */
  loadDemoData() {
    const demo = DemoDataService.getDemoDatasets();
    
    this.loadedFiles.aptos = {
      file: null,
      fileName: demo.aptos.fileName,
      fileSize: demo.aptos.fileSize,
      sheetName: 'Aptos',
      headers: demo.aptos.headers,
      rows: demo.aptos.rows,
      mappings: {},
      manualOverrides: {},
      isManualMapped: {}
    };

    this.loadedFiles.matriculados_chp = {
      file: null,
      fileName: demo.matriculados_chp.fileName,
      fileSize: demo.matriculados_chp.fileSize,
      sheetName: 'Matriculados CHP',
      headers: demo.matriculados_chp.headers,
      rows: demo.matriculados_chp.rows,
      mappings: {},
      manualOverrides: {},
      isManualMapped: {}
    };

    this.loadedFiles.matriculados_iftp = {
      file: null,
      fileName: demo.matriculados_iftp.fileName,
      fileSize: demo.matriculados_iftp.fileSize,
      sheetName: 'Matriculados IFTP',
      headers: demo.matriculados_iftp.headers,
      rows: demo.matriculados_iftp.rows,
      mappings: {},
      manualOverrides: {},
      isManualMapped: {}
    };

    this.loadedFiles.participacao = {
      file: null,
      fileName: demo.participacao.fileName,
      fileSize: demo.participacao.fileSize,
      sheetName: 'Participação',
      headers: demo.participacao.headers,
      rows: demo.participacao.rows,
      mappings: {},
      manualOverrides: {},
      isManualMapped: {}
    };

    this.renderFileCards();
    this.updateStep2NextButton();
  }

  /**
   * Renders the 4 file role cards (Aptos, Matriculados CHP, Matriculados IFTP, Participação)
   */
  renderFileCards() {
    const model = ModelRegistry.getModelById(this.selectedModelId);
    const roles = Object.keys(model.fileRoles);

    this.filesGridContainer.innerHTML = '';

    roles.forEach((roleKey) => {
      const roleDef = model.fileRoles[roleKey];
      const loaded = this.loadedFiles[roleKey];

      const card = document.createElement('div');
      card.className = `file-role-card ${loaded ? 'loaded' : roleDef.required ? 'missing-required' : ''}`;

      let contentHTML = `
        <div class="file-role-header">
          <span class="file-role-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
            </svg>
            ${roleDef.label}
          </span>
          <span class="role-tag ${roleDef.required ? 'required' : 'optional'}">
            ${roleDef.required ? 'Obrigatório' : 'Opcional'}
          </span>
        </div>
        <p style="font-size: 0.775rem; color: var(--text-muted);">${roleDef.description}</p>
      `;

      if (loaded) {
        contentHTML += `
          <div class="file-details-box">
            <div class="file-details-info">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
              </svg>
              <div>
                <div class="file-name-text" title="${loaded.fileName}">${loaded.fileName}</div>
                <div class="file-meta-text">
                  ${loaded.rows.length} registros &bull; ${loaded.headers.length} colunas &bull; ${FileReaderService.formatFileSize(loaded.fileSize)}
                </div>
              </div>
            </div>
            <button type="button" class="btn btn-danger-ghost btn-sm btn-remove-file" data-role="${roleKey}" title="Remover este arquivo">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        `;
      } else {
        const hint = roleDef.category ? `"${roleDef.category.toLowerCase()}"` : `"${roleKey}"`;
        contentHTML += `
          <div class="file-empty-placeholder">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <span>Nenhum arquivo associado</span>
            <span style="font-size: 0.7rem; color: var(--text-dim);">Nome deve conter: ${hint}</span>
          </div>
        `;
      }

      card.innerHTML = contentHTML;
      this.filesGridContainer.appendChild(card);
    });

    // Attach remove event handlers
    this.filesGridContainer.querySelectorAll('.btn-remove-file').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const role = btn.getAttribute('data-role');
        this.loadedFiles[role] = null;
        this.renderFileCards();
        this.updateStep2NextButton();
      });
    });
  }

  /**
   * Updates Next button status in Step 2
   */
  updateStep2NextButton() {
    const isComplete = this.isStep2Complete();
    this.btnStep2Next.disabled = !isComplete;
    if (isComplete) {
      this.btnStep2Next.classList.add('btn-primary');
    }
  }

  /**
   * Prepares column matching and renders Step 3 tables
   */
  prepareColumnMapping() {
    const model = ModelRegistry.getModelById(this.selectedModelId);
    this.mappingTablesContainer.innerHTML = '';

    const allRoles = Object.keys(model.fileRoles);

    allRoles.forEach((roleKey) => {
      const roleDef = model.fileRoles[roleKey];
      const fileData = this.loadedFiles[roleKey];

      // If optional file is not uploaded, render an informative banner
      if (!fileData) {
        if (!roleDef.required) {
          const optionalCard = document.createElement('div');
          optionalCard.className = 'card';
          optionalCard.style.padding = '1.25rem';
          optionalCard.innerHTML = `
            <div class="alert-banner info" style="margin-bottom: 0;">
              <div class="alert-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
              </div>
              <div class="alert-content">
                <div class="alert-title">${roleDef.label} (Opcional)</div>
                <div>ℹ Arquivo opcional não enviado. Os valores de Presentes e Ausentes serão considerados como 0 e 0%. A conversão pode prosseguir normalmente.</div>
              </div>
            </div>
          `;
          this.mappingTablesContainer.appendChild(optionalCard);
        }
        return;
      }

      // Match all fields respecting manual overrides
      const matchResults = ColumnMatcher.matchAllFields(
        fileData.headers,
        roleDef.fields,
        fileData.manualOverrides || {}
      );

      // Save matched columns directly into fileData.mappings and track isManualMapped
      fileData.mappings = {};
      fileData.isManualMapped = {};

      matchResults.forEach((res) => {
        fileData.mappings[res.key] = res.matchedHeader || '';
        fileData.isManualMapped[res.key] = res.isManual;
      });

      // Render Table Card
      const sectionCard = document.createElement('div');
      sectionCard.className = 'card';
      sectionCard.style.padding = '1.25rem';

      let tableHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.5rem;">
          <div>
            <h4 style="font-size: 1rem; font-weight: 700; color: var(--text-main); display: flex; align-items: center; gap: 0.5rem;">
              <span class="role-tag ${roleDef.required ? 'required' : 'optional'}">${roleDef.label}</span>
              <span>${fileData.fileName}</span>
            </h4>
            <span style="font-size: 0.75rem; color: var(--text-muted);">${fileData.rows.length} registros &bull; ${fileData.headers.length} colunas encontradas</span>
          </div>
        </div>

        <div class="table-responsive">
          <table class="custom-table">
            <thead>
              <tr>
                <th style="width: 28%;">Campo que o sistema precisa</th>
                <th style="width: 32%;">Coluna de origem da planilha</th>
                <th style="width: 18%;">Método</th>
                <th style="width: 22%; text-align: right;">Ação</th>
              </tr>
            </thead>
            <tbody>
      `;

      matchResults.forEach((fieldRes) => {
        const fieldDef = roleDef.fields.find((f) => f.key === fieldRes.key);
        const currentMapped = fileData.mappings[fieldDef.key] || '';
        const isMapped = !!currentMapped;
        const isManual = !!fileData.isManualMapped[fieldDef.key];

        tableHTML += `
          <tr data-role="${roleKey}" data-field="${fieldDef.key}">
            <td>
              <strong style="font-size: 0.9rem; color: var(--text-main);">${fieldDef.label}</strong>
              <span style="display: block; font-size: 0.7rem; color: var(--text-dim); font-family: var(--font-mono);">
                Regra fixa: ${fieldDef.key}
              </span>
            </td>
            <td>
              ${
                isMapped
                  ? `<code style="font-family: var(--font-mono); font-size: 0.85rem; font-weight: 700; color: ${
                      isManual ? 'var(--accent-warning)' : 'var(--text-main)'
                    }; background: var(--surface-2); padding: 0.25rem 0.5rem; border-radius: 4px; border: 1px solid var(--border-subtle);">${currentMapped}</code>`
                  : `<span style="color: var(--accent-danger); font-size: 0.85rem; font-style: italic;">— Não identificada</span>`
              }
            </td>
            <td>
              ${
                isMapped
                  ? isManual
                    ? `<span class="status-pill warning"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg> Manual</span>`
                    : `<span class="status-pill success"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Automático</span>`
                  : `<span class="status-pill danger"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg> Pendente</span>`
              }
            </td>
            <td style="text-align: right;">
              <button type="button" class="btn ${isMapped ? 'btn-secondary' : 'btn-primary'} btn-sm btn-open-picker"
                      data-role="${roleKey}"
                      data-field="${fieldDef.key}">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
                ${isMapped ? 'Alterar' : 'Selecionar coluna'}
              </button>
            </td>
          </tr>
        `;
      });

      tableHTML += `
            </tbody>
          </table>
        </div>
      `;

      sectionCard.innerHTML = tableHTML;
      this.mappingTablesContainer.appendChild(sectionCard);
    });

    // Attach modal open trigger to all action buttons
    this.mappingTablesContainer.querySelectorAll('.btn-open-picker').forEach((btn) => {
      btn.addEventListener('click', () => {
        const role = btn.getAttribute('data-role');
        const fieldKey = btn.getAttribute('data-field');
        this.openColumnPicker(role, fieldKey);
      });
    });

    this.validateStep3Mappings();
  }

  /**
   * Opens the column picker modal displaying ALL available columns of that file
   */
  openColumnPicker(roleKey, fieldKey) {
    const model = ModelRegistry.getModelById(this.selectedModelId);
    const roleDef = model.fileRoles[roleKey];
    const fileData = this.loadedFiles[roleKey];
    const fieldDef = roleDef.fields.find((f) => f.key === fieldKey);

    if (!fileData || !fieldDef) return;

    this.pickerState = {
      roleKey,
      fieldKey,
      selectedColumn: fileData.mappings[fieldKey] || null
    };

    this.modalPickerTitle.textContent = `Selecionar Coluna para: ${fieldDef.label}`;
    this.modalPickerSubtitle.textContent = `Planilha de origem: ${fileData.fileName}`;

    // Render list of all columns in this file
    const firstRow = fileData.rows && fileData.rows.length > 0 ? fileData.rows[0] : {};

    // Collect currently used columns by other fields in this file to display conflict warnings
    const usedByOtherFields = {};
    roleDef.fields.forEach((f) => {
      if (f.key !== fieldKey && fileData.mappings[f.key]) {
        usedByOtherFields[fileData.mappings[f.key]] = f.label;
      }
    });

    this.modalPickerBody.innerHTML = fileData.headers
      .map((header) => {
        const isSelected = header === this.pickerState.selectedColumn;
        const isConflict = !!usedByOtherFields[header];
        const sampleVal = firstRow[header] !== undefined && firstRow[header] !== null ? String(firstRow[header]) : '';

        return `
          <label class="radio-card ${isSelected ? 'selected' : ''} ${isConflict ? 'has-conflict' : ''}" style="margin-bottom: 0.5rem;">
            <input type="radio" name="columnChoice" value="${header}" ${isSelected ? 'checked' : ''}>
            <div style="flex: 1; min-width: 0;">
              <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                <strong style="font-family: var(--font-mono); font-size: 0.9rem; color: var(--text-main);">${header}</strong>
                ${
                  isConflict
                    ? `<span class="status-pill warning" style="font-size: 0.7rem;">Já associada a "${usedByOtherFields[header]}"</span>`
                    : ''
                }
              </div>
              <div style="font-size: 0.775rem; color: var(--text-dim); margin-top: 0.25rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                Exemplo (1ª linha): <span style="color: var(--text-muted);">${sampleVal || '— Vazio —'}</span>
              </div>
            </div>
          </label>
        `;
      })
      .join('');

    // Attach click listeners to radio cards
    this.modalPickerBody.querySelectorAll('.radio-card').forEach((card) => {
      card.addEventListener('click', () => {
        this.modalPickerBody.querySelectorAll('.radio-card').forEach((c) => c.classList.remove('selected'));
        card.classList.add('selected');
        const input = card.querySelector('input[type="radio"]');
        if (input) {
          input.checked = true;
          this.pickerState.selectedColumn = input.value;
        }
      });
    });

    this.modalColumnPicker.classList.add('active');
    this.modalColumnPicker.setAttribute('aria-hidden', 'false');
  }

  /**
   * Closes the column picker modal
   */
  closeColumnPicker() {
    this.modalColumnPicker.classList.remove('active');
    this.modalColumnPicker.setAttribute('aria-hidden', 'true');
    this.pickerState = { roleKey: null, fieldKey: null, selectedColumn: null };
  }

  /**
   * Confirms the manual column selection
   */
  confirmColumnPicker() {
    const { roleKey, fieldKey, selectedColumn } = this.pickerState;
    if (!roleKey || !fieldKey || !selectedColumn) {
      alert('Por favor, selecione uma coluna antes de confirmar.');
      return;
    }

    const fileData = this.loadedFiles[roleKey];
    if (!fileData) return;

    if (!fileData.manualOverrides) fileData.manualOverrides = {};
    if (!fileData.isManualMapped) fileData.isManualMapped = {};

    fileData.manualOverrides[fieldKey] = selectedColumn;
    fileData.mappings[fieldKey] = selectedColumn;
    fileData.isManualMapped[fieldKey] = true;

    this.closeColumnPicker();
    this.prepareColumnMapping();
  }

  /**
   * Validates if all mandatory fields in Step 3 are mapped
   */
  validateStep3Mappings() {
    const model = ModelRegistry.getModelById(this.selectedModelId);
    let allValid = true;
    let totalMissing = 0;

    Object.keys(model.fileRoles).forEach((roleKey) => {
      const roleDef = model.fileRoles[roleKey];
      if (roleDef.required) {
        const fileData = this.loadedFiles[roleKey];
        if (!fileData) {
          allValid = false;
          totalMissing++;
        } else {
          roleDef.fields.forEach((f) => {
            if (f.required && !fileData.mappings[f.key]) {
              allValid = false;
              totalMissing++;
            }
          });
        }
      }
    });

    // Update Status Badge and Converter Button
    if (allValid) {
      this.mappingStatusSummary.innerHTML = `
        <span class="status-pill success" style="font-size: 0.85rem; padding: 0.4rem 0.9rem;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
          Todas as colunas necessárias foram associadas
        </span>
      `;
      this.btnProcessMacro.disabled = false;
    } else {
      this.mappingStatusSummary.innerHTML = `
        <span class="status-pill danger" style="font-size: 0.85rem; padding: 0.4rem 0.9rem;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
          Existem ${totalMissing} campo(s) obrigatório(s) pendente(s)
        </span>
      `;
      this.btnProcessMacro.disabled = true;
    }
  }

  /**
   * Executes business logic and renders Step 4
   */
  processMacroAndShowPreview() {
    try {
      const model = ModelRegistry.getModelById(this.selectedModelId);
      this.macroResult = model.process(this.loadedFiles);

      this.renderKPIs();
      this.renderWarnings();
      this.renderPreviewTableHeader();
      this.renderPreviewTableRows();

      this.goToStep(4);
    } catch (err) {
      alert(`Erro durante o processamento do macro: ${err.message}`);
    }
  }

  /**
   * Render KPI summary cards
   */
  renderKPIs() {
    const stats = this.macroResult.stats;
    const kpiData = [
      { title: 'Total de Registros', value: stats.totalTurmas, highlight: true },
      { title: 'Total de Alunos', value: stats.totalMatriculados },
      { title: 'Alunos Aptos/Agendados', value: stats.totalAptosAgendados },
      { title: 'Inaptos/Não Agendados', value: stats.totalInaptosNaoAgendados },
      { title: 'Presentes', value: stats.totalPresentes },
      { title: 'Ausentes', value: stats.totalAusentes },
      { title: 'Taxa de Presença', value: stats.taxaPresencaGeral, highlight: true }
    ];

    this.kpiGridContainer.innerHTML = kpiData
      .map(
        (kpi) => `
        <div class="kpi-card ${kpi.highlight ? 'highlight' : ''}">
          <span class="kpi-title">${kpi.title}</span>
          <span class="kpi-value">${kpi.value}</span>
        </div>
      `
      )
      .join('');
  }

  /**
   * Render warnings alert banner if any
   */
  renderWarnings() {
    const warnings = this.macroResult.warnings;
    if (!warnings || warnings.length === 0) {
      this.warningsContainer.innerHTML = `
        <div class="alert-banner success">
          <div class="alert-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          </div>
          <div class="alert-content">
            <div class="alert-title">Processamento 100% Consistente</div>
            <div>Todas as turmas e categorias foram consolidadas perfeitamente.</div>
          </div>
        </div>
      `;
    } else {
      this.warningsContainer.innerHTML = `
        <div class="alert-banner warning">
          <div class="alert-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
          </div>
          <div class="alert-content">
            <div class="alert-title">Avisos de Inconsistência (${warnings.length})</div>
            <ul class="alert-list">
              ${warnings.slice(0, 5).map((w) => `<li>${w}</li>`).join('')}
              ${warnings.length > 5 ? `<li>...e mais ${warnings.length - 5} avisos.</li>` : ''}
            </ul>
          </div>
        </div>
      `;
    }
  }

  /**
   * Render Preview Table Headers (13 columns)
   */
  renderPreviewTableHeader() {
    this.macroTableHeaderRow.innerHTML = this.macroResult.columns
      .map((col, idx) => `<th>${idx + 1}. ${col}</th>`)
      .join('');
  }

  /**
   * Render Preview Table Rows with search filtering
   */
  renderPreviewTableRows() {
    if (!this.macroResult || !this.macroResult.rows) return;

    let filtered = this.macroResult.rows;
    if (this.filterQuery) {
      filtered = filtered.filter((row) => {
        const u = String(row['Unidade operacional (Escola)'] || '').toLowerCase();
        const c = String(row['Curso'] || '').toLowerCase();
        const cat = String(row['Categoria'] || '').toLowerCase();
        const t = String(row['Turma'] || '').toLowerCase();
        const m = String(row['Modalidade'] || '').toLowerCase();
        return (
          u.includes(this.filterQuery) ||
          c.includes(this.filterQuery) ||
          cat.includes(this.filterQuery) ||
          t.includes(this.filterQuery) ||
          m.includes(this.filterQuery)
        );
      });
    }

    this.tableRowCountLabel.textContent = `Exibindo ${filtered.length} de ${this.macroResult.rows.length} registros`;

    if (filtered.length === 0) {
      this.macroTableBody.innerHTML = `
        <tr>
          <td colspan="13" style="text-align: center; padding: 2.5rem; color: var(--text-dim);">
            Nenhuma turma encontrada para o filtro "${this.filterQuery}".
          </td>
        </tr>
      `;
      return;
    }

    this.macroTableBody.innerHTML = filtered
      .map((row) => {
        return `
          <tr>
            <td><span style="font-weight: 600; color: var(--text-muted);">${row['Departamento Regional (DR)']}</span></td>
            <td><strong>${row['Unidade operacional (Escola)']}</strong></td>
            <td>${row['Curso']}</td>
            <td>
              <span class="status-pill ${row['Categoria'] === 'CHP' ? 'info' : 'warning'}" style="font-weight: 700;">
                ${row['Categoria']}
              </span>
            </td>
            <td>
              <span class="status-pill ${row['Modalidade'] === 'Semipresencial' ? 'info' : 'success'}">
                ${row['Modalidade']}
              </span>
            </td>
            <td><code style="font-family: var(--font-mono); font-size: 0.8rem;">${row['Turma']}</code></td>
            <td style="font-weight: 700; text-align: right;">${row['Alunos']}</td>
            <td style="color: var(--accent-success); font-weight: 600; text-align: right;">${row['Alunos Aptos/Agendados']}</td>
            <td style="color: var(--accent-danger); font-weight: 600; text-align: right;">${row['Alunos Inaptos/Não Agendados']}</td>
            <td style="text-align: right;">${row['Presentes']}</td>
            <td style="font-weight: 600; color: var(--accent-success); text-align: right;">${row['Presentes (%)']}</td>
            <td style="text-align: right;">${row['Ausentes']}</td>
            <td style="font-weight: 600; color: var(--accent-danger); text-align: right;">${row['Ausentes (%)']}</td>
          </tr>
        `;
      })
      .join('');
  }

  /**
   * Export to XLSX matching official modelo final po.xlsx template
   */
  async exportXLSX() {
    if (!this.macroResult) return;
    try {
      await ExporterService.exportToXLSX(this.macroResult.columns, this.macroResult.rows, 'SAEP - Prova Objetiva');
    } catch (err) {
      console.error('Erro na exportação XLSX:', err);
      alert(`Erro ao exportar XLSX: ${err.message}`);
    }
  }

  /**
   * Export to CSV
   */
  exportCSV() {
    if (!this.macroResult) return;
    try {
      ExporterService.exportCSV(this.macroResult.columns, this.macroResult.rows, ';', 'SAEP_Prova_Objetiva');
    } catch (err) {
      alert(`Erro ao exportar CSV: ${err.message}`);
    }
  }

  /**
   * Reset application to clean state
   */
  resetAll() {
    this.loadedFiles = {
      aptos: null,
      matriculados_chp: null,
      matriculados_iftp: null,
      participacao: null
    };
    this.macroResult = null;
    this.filterQuery = '';
    this.pickerState = { roleKey: null, fieldKey: null, selectedColumn: null };
    this.tableSearchInput.value = '';
    this.renderFileCards();
    this.updateStep2NextButton();
    this.goToStep(1);
  }
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});
