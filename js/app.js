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
      participacao: null,
      estudantes: null
    };
    this.macroResult = null;
    this.filterQuery = '';

    // Active modal picker state
    this.pickerState = {
      roleKey: null,
      fieldKey: null,
      selectedColumn: null
    };

    // Active discrepancy resolution modal state
    this.discrepancyState = {
      activeGroupKey: null,
      activeDiscrepancy: null,
      selectedCandidate: null,
      searchQuery: ''
    };
    this.lastFocusedElement = null;

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

    // Toast Container
    this.toastContainer = document.getElementById('toastContainer');

    // Reset Modal Elements
    this.modalConfirmReset = document.getElementById('modalConfirmReset');
    this.btnResetModalClose = document.getElementById('btnResetModalClose');
    this.btnResetCancel = document.getElementById('btnResetCancel');
    this.btnResetConfirm = document.getElementById('btnResetConfirm');

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
    this.preConsolidationSummary = document.getElementById('preConsolidationSummary');
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
    this.tableFilterTabs = document.getElementById('tableFilterTabs');
    this.filterTabAll = document.getElementById('filterTabAll');
    this.filterTabWarnings = document.getElementById('filterTabWarnings');
    this.countAllRows = document.getElementById('countAllRows');
    this.countWarningRows = document.getElementById('countWarningRows');
    this.activeFilterTab = 'all';
    this.btnExportXLSX = document.getElementById('btnExportXLSX');
    this.btnExportCSV = document.getElementById('btnExportCSV');
    this.btnStep4Back = document.getElementById('btnStep4Back');
    this.btnNewConversion = document.getElementById('btnNewConversion');
    this.btnHeaderReset = document.getElementById('btnHeaderReset');

    // Discrepancy Resolution Modal Elements
    this.modalResolveDiscrepancy = document.getElementById('modalResolveDiscrepancy');
    this.modalDiscrepancyTitle = document.getElementById('modalDiscrepancyTitle');
    this.modalDiscrepancySubtitle = document.getElementById('modalDiscrepancySubtitle');
    this.btnDiscrepancyClose = document.getElementById('btnDiscrepancyClose');
    this.discrepancySourceContainer = document.getElementById('discrepancySourceContainer');
    this.discrepancyDiagnosticContainer = document.getElementById('discrepancyDiagnosticContainer');
    this.discrepancyDiagnosticText = document.getElementById('discrepancyDiagnosticText');
    this.discrepancyCandidatesCountBadge = document.getElementById('discrepancyCandidatesCountBadge');
    this.discrepancySearchInput = document.getElementById('discrepancySearchInput');
    this.discrepancyConflictBanner = document.getElementById('discrepancyConflictBanner');
    this.discrepancyConflictText = document.getElementById('discrepancyConflictText');
    this.discrepancyCandidatesList = document.getElementById('discrepancyCandidatesList');
    this.btnDiscrepancyKeepUnassociated = document.getElementById('btnDiscrepancyKeepUnassociated');
    this.btnDiscrepancyUndo = document.getElementById('btnDiscrepancyUndo');
    this.btnDiscrepancyCancel = document.getElementById('btnDiscrepancyCancel');
    this.btnDiscrepancyApply = document.getElementById('btnDiscrepancyApply');

    // Confirmation Modal Elements
    this.modalConfirmManualAssociation = document.getElementById('modalConfirmManualAssociation');
    this.modalConfirmAssocTitle = document.getElementById('modalConfirmAssocTitle');
    this.modalConfirmAssocBody = document.getElementById('modalConfirmAssocBody');
    this.btnConfirmAssocClose = document.getElementById('btnConfirmAssocClose');
    this.btnConfirmAssocCancel = document.getElementById('btnConfirmAssocCancel');
    this.btnConfirmAssocExecute = document.getElementById('btnConfirmAssocExecute');
  }

  /**
   * Bind DOM event listeners
   */
  bindEvents() {
    // Header Reset with Confirmation Modal
    this.btnHeaderReset.addEventListener('click', () => this.openResetModal());
    this.btnResetModalClose.addEventListener('click', () => this.closeResetModal());
    this.btnResetCancel.addEventListener('click', () => this.closeResetModal());
    this.btnResetConfirm.addEventListener('click', () => {
      this.closeResetModal();
      this.resetAll();
      this.showToast('Aplicação reiniciada para uma nova conversão.', 'info', 'Reiniciado');
    });
    this.modalConfirmReset.addEventListener('click', (e) => {
      if (e.target === this.modalConfirmReset) this.closeResetModal();
    });

    // Step 1: Model Selection
    this.cardModelObjetiva.addEventListener('click', () => this.selectModel('prova-objetiva'));
    this.cardModelPratica.addEventListener('click', () => this.selectModel('prova-pratica'));
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
    this.dropzone.addEventListener('click', (e) => {
      if (e.target.tagName !== 'BUTTON') {
        this.fileInput.click();
      }
    });
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

    // Discrepancy Resolution Modal Events
    if (this.btnDiscrepancyClose) {
      this.btnDiscrepancyClose.addEventListener('click', () => this.closeDiscrepancyModal());
    }
    if (this.btnDiscrepancyCancel) {
      this.btnDiscrepancyCancel.addEventListener('click', () => this.closeDiscrepancyModal());
    }
    if (this.btnDiscrepancyKeepUnassociated) {
      this.btnDiscrepancyKeepUnassociated.addEventListener('click', () => {
        this.closeDiscrepancyModal();
        this.showToast('Turma mantida sem associação de matrícula.', 'info', 'Sem Alteração');
      });
    }
    if (this.btnDiscrepancyUndo) {
      this.btnDiscrepancyUndo.addEventListener('click', () => this.undoActiveDiscrepancy());
    }
    if (this.btnDiscrepancyApply) {
      this.btnDiscrepancyApply.addEventListener('click', () => this.openConfirmManualAssociationModal());
    }
    if (this.discrepancySearchInput) {
      this.discrepancySearchInput.addEventListener('input', (e) => {
        this.discrepancyState.searchQuery = e.target.value.trim().toLowerCase();
        this.renderDiscrepancyCandidates();
      });
    }
    if (this.modalResolveDiscrepancy) {
      this.modalResolveDiscrepancy.addEventListener('click', (e) => {
        if (e.target === this.modalResolveDiscrepancy) {
          this.closeDiscrepancyModal();
        }
      });
    }

    // Confirmation Modal Events
    if (this.btnConfirmAssocClose) {
      this.btnConfirmAssocClose.addEventListener('click', () => this.closeConfirmManualAssociationModal());
    }
    if (this.btnConfirmAssocCancel) {
      this.btnConfirmAssocCancel.addEventListener('click', () => this.closeConfirmManualAssociationModal());
    }
    if (this.btnConfirmAssocExecute) {
      this.btnConfirmAssocExecute.addEventListener('click', () => this.confirmAndApplyManualAssociation());
    }
    if (this.modalConfirmManualAssociation) {
      this.modalConfirmManualAssociation.addEventListener('click', (e) => {
        if (e.target === this.modalConfirmManualAssociation) {
          this.closeConfirmManualAssociationModal();
        }
      });
    }

    // Global Esc Keyboard Handler for all modals
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (this.modalConfirmManualAssociation && this.modalConfirmManualAssociation.classList.contains('active')) {
          this.closeConfirmManualAssociationModal();
        } else if (this.modalResolveDiscrepancy && this.modalResolveDiscrepancy.classList.contains('active')) {
          this.closeDiscrepancyModal();
        } else if (this.modalColumnPicker && this.modalColumnPicker.classList.contains('active')) {
          this.closeColumnPicker();
        } else if (this.modalConfirmReset && this.modalConfirmReset.classList.contains('active')) {
          this.closeResetModal();
        }
      }
    });

    // Step 4 Nav, Filter Tabs & Exports
    if (this.filterTabAll) {
      this.filterTabAll.addEventListener('click', () => {
        this.activeFilterTab = 'all';
        this.filterTabAll.classList.add('active');
        if (this.filterTabWarnings) this.filterTabWarnings.classList.remove('active');
        this.renderPreviewTableRows();
      });
    }

    if (this.filterTabWarnings) {
      this.filterTabWarnings.addEventListener('click', () => {
        this.activeFilterTab = 'warning';
        this.filterTabWarnings.classList.add('active');
        if (this.filterTabAll) this.filterTabAll.classList.remove('active');
        this.renderPreviewTableRows();
      });
    }

    this.tableSearchInput.addEventListener('input', (e) => {
      this.filterQuery = e.target.value.trim().toLowerCase();
      this.renderPreviewTableRows();
    });

    this.btnExportXLSX.addEventListener('click', () => this.exportXLSX());
    this.btnExportCSV.addEventListener('click', () => this.exportCSV());
    this.btnStep4Back.addEventListener('click', () => this.goToStep(3));
    this.btnNewConversion.addEventListener('click', () => this.openResetModal());
  }

  /**
   * Model selector handler
   */
  selectModel(modelId) {
    if (this.selectedModelId !== modelId) {
      this.selectedModelId = modelId;
      this.loadedFiles = {
        aptos: null,
        matriculados_chp: null,
        matriculados_iftp: null,
        participacao: null,
        estudantes: null
      };
      this.macroResult = null;
    }
    this.cardModelObjetiva.classList.toggle('selected', modelId === 'prova-objetiva');
    this.cardModelPratica.classList.toggle('selected', modelId === 'prova-pratica');
    const model = ModelRegistry.getModelById(modelId);
    if (model) {
      this.activeModelBadge.textContent = `Modelo Ativo: ${model.name}`;
    }
    this.renderFileCards();
    this.updateStep2NextButton();
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
   * Checks if Step 2 requirements are fulfilled for active model
   */
  isStep2Complete() {
    const model = ModelRegistry.getModelById(this.selectedModelId);
    if (!model || !model.fileRoles) return false;
    const requiredRoles = Object.keys(model.fileRoles).filter((r) => model.fileRoles[r].required);
    return requiredRoles.every((role) => !!this.loadedFiles[role]);
  }

  /**
   * Handle multiple files dropped or chosen
   * @param {FileList|File[]} fileList
   * @param {string|null} [targetRole=null]
   */
  async handleFilesSelected(fileList, targetRole = null) {
    if (!fileList || fileList.length === 0) return;

    const model = ModelRegistry.getModelById(this.selectedModelId);
    const unassignedFiles = [];

    // Set processing state on the specific card or all relevant cards
    if (targetRole) {
      const card = this.filesGridContainer.querySelector(`[data-card-role="${targetRole}"]`);
      if (card) {
        card.className = 'file-role-card processing';
        const ph = card.querySelector('.file-empty-placeholder');
        if (ph) ph.innerHTML = '<div class="spinner"></div><span>Lendo planilha...</span>';
      }
    }

    // Give browser brief tick to paint loading state
    await new Promise((resolve) => setTimeout(resolve, 40));

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      try {
        const role = targetRole || model.identifyFileRole(file.name);
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
          isManualMapped: {},
          manualItedOverrides: {}
        };

        if (role) {
          this.loadedFiles[role] = filePayload;
          this.showToast(`Arquivo "${file.name}" carregado com sucesso (${parsed.primarySheet.rows.length.toLocaleString('pt-BR')} registros na aba "${parsed.primarySheet.name}").`, 'success', 'Arquivo Validado');
        } else {
          const lowerName = file.name.toLowerCase();
          if (lowerName.includes('matriculado') && !lowerName.includes('chp') && !lowerName.includes('iftp')) {
            this.showToast(`O arquivo "${file.name}" é de Matriculados, mas precisa indicar a categoria no nome (ex: "matriculados chp.xlsx" ou "matriculados iftp.xlsx").`, 'warning', 'Categoria Não Identificada');
          }
          unassignedFiles.push(filePayload);
        }
      } catch (err) {
        this.showToast(`Erro ao processar "${file.name}": ${err.message}`, 'danger', 'Erro na Leitura');
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
      this.showToast(`Arquivo associado a ${model.fileRoles[roleKey]?.label || roleKey} (${payload.rows.length.toLocaleString('pt-BR')} registros).`, 'info', 'Arquivo Associado');
    };

    // If there were unassigned files, try assigning to first missing required slot
    if (unassignedFiles.length > 0) {
      const activeRoles = Object.keys(model.fileRoles);
      for (const rKey of activeRoles) {
        if (!this.loadedFiles[rKey] && unassignedFiles.length > 0) {
          assignUnassigned(rKey, unassignedFiles.shift());
        }
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
    if (this.selectedModelId === 'prova-pratica') {
      const demo = DemoDataService.getDemoDatasetsPP();

      this.loadedFiles.participacao = {
        file: null,
        fileName: demo.participacao.fileName,
        fileSize: demo.participacao.fileSize,
        sheetName: 'Planilha1',
        headers: demo.participacao.headers,
        rows: demo.participacao.rows,
        parsedSheets: [{ name: 'Planilha1', headers: demo.participacao.headers, rows: demo.participacao.rows }],
        mappings: {},
        manualOverrides: {},
        isManualMapped: {}
      };

      this.loadedFiles.estudantes = {
        file: null,
        fileName: demo.estudantes.fileName,
        fileSize: demo.estudantes.fileSize,
        sheetName: 'Planilha1',
        headers: demo.estudantes.headers,
        rows: demo.estudantes.rows,
        parsedSheets: [{ name: 'Planilha1', headers: demo.estudantes.headers, rows: demo.estudantes.rows }],
        mappings: {},
        manualOverrides: {},
        isManualMapped: {},
        manualItedOverrides: {}
      };

      this.renderFileCards();
      this.updateStep2NextButton();
      this.showToast('Conjunto de dados de exemplo da Prova Prática carregado com sucesso!', 'success', 'Dados de Teste');
      return;
    }

    const demo = DemoDataService.getDemoDatasets();
    
    this.loadedFiles.aptos = {
      file: null,
      fileName: demo.aptos.fileName,
      fileSize: demo.aptos.fileSize,
      sheetName: 'Aptos',
      headers: demo.aptos.headers,
      rows: demo.aptos.rows,
      parsedSheets: [{ name: 'Aptos', headers: demo.aptos.headers, rows: demo.aptos.rows }],
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
      parsedSheets: [{ name: 'Matriculados CHP', headers: demo.matriculados_chp.headers, rows: demo.matriculados_chp.rows }],
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
      parsedSheets: [{ name: 'Matriculados IFTP', headers: demo.matriculados_iftp.headers, rows: demo.matriculados_iftp.rows }],
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
      parsedSheets: [{ name: 'Participação', headers: demo.participacao.headers, rows: demo.participacao.rows }],
      mappings: {},
      manualOverrides: {},
      isManualMapped: {}
    };

    this.renderFileCards();
    this.updateStep2NextButton();
    this.showToast('Conjunto de dados de exemplo carregado com sucesso!', 'success', 'Dados de Teste');
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
      card.className = `file-role-card ${loaded ? 'loaded' : ''}`;
      card.setAttribute('data-card-role', roleKey);

      let contentHTML = `
        <input type="file" class="card-file-input" data-role="${roleKey}" accept=".xlsx, .xls, .csv" style="display: none;">
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
        <p style="font-size: 0.775rem; color: var(--text-muted); margin: 0;">${roleDef.description}</p>
      `;

      if (loaded) {
        const totalSheets = loaded.parsedSheets?.length || 1;
        const sheetBadgeText = totalSheets > 1
          ? `Aba utilizada: "${loaded.sheetName}" (${totalSheets} abas encontradas)`
          : `Aba utilizada: "${loaded.sheetName}"`;

        contentHTML += `
          <div class="file-details-box">
            <div class="file-details-top">
              <div class="file-details-info">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                </svg>
                <div style="min-width: 0;">
                  <div class="file-name-text" title="${loaded.fileName}">${loaded.fileName}</div>
                  <div class="file-meta-text">
                    ${loaded.rows.length.toLocaleString('pt-BR')} registros &bull; ${loaded.headers.length} colunas &bull; ${FileReaderService.formatFileSize(loaded.fileSize)}
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
            <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem; padding-top: 0.5rem; border-top: 1px solid var(--border-subtle);">
              <span class="sheet-badge" title="Planilha interna utilizada">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
                ${sheetBadgeText}
              </span>
              <button type="button" class="btn btn-secondary btn-sm btn-trigger-card-upload" data-role="${roleKey}" title="Substituir este arquivo">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="17 8 12 3 7 8"></polyline>
                  <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
                Substituir
              </button>
            </div>
          </div>
        `;
      } else {
        const hint = roleDef.category ? `"${roleDef.category.toLowerCase()}"` : `"${roleKey}"`;
        contentHTML += `
          <div class="file-empty-placeholder">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <div style="display: flex; flex-direction: column; gap: 0.2rem;">
              <span style="font-weight: 600; color: var(--text-main);">Aguardando arquivo</span>
              <span class="file-empty-hint">Arraste aqui ou selecione o arquivo com ${hint}</span>
            </div>
            <button type="button" class="btn btn-secondary btn-sm btn-trigger-card-upload" data-role="${roleKey}" style="margin-top: 0.25rem;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
              Selecionar arquivo
            </button>
          </div>
        `;
      }

      card.innerHTML = contentHTML;
      this.filesGridContainer.appendChild(card);
    });

    // Attach card file input and button handlers
    this.filesGridContainer.querySelectorAll('.btn-trigger-card-upload').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const role = btn.getAttribute('data-role');
        const cardInput = this.filesGridContainer.querySelector(`.card-file-input[data-role="${role}"]`);
        if (cardInput) cardInput.click();
      });
    });

    this.filesGridContainer.querySelectorAll('.card-file-input').forEach((input) => {
      input.addEventListener('change', (e) => {
        const role = input.getAttribute('data-role');
        if (e.target.files && e.target.files.length > 0) {
          this.handleFilesSelected(e.target.files, role);
        }
      });
    });

    // Attach remove event handlers
    this.filesGridContainer.querySelectorAll('.btn-remove-file').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const role = btn.getAttribute('data-role');
        const fileName = this.loadedFiles[role]?.fileName || '';
        this.loadedFiles[role] = null;
        this.renderFileCards();
        this.updateStep2NextButton();
        this.showToast(`Arquivo "${fileName}" removido.`, 'info', 'Arquivo Removido');
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

    // Render dynamic pre-consolidation summary
    this.renderPreConsolidationSummary();

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
        const isRequired = !!fieldDef.required;

        tableHTML += `
          <tr data-role="${roleKey}" data-field="${fieldDef.key}">
            <td>
              <strong style="font-size: 0.9rem; color: var(--text-main);">${fieldDef.label}</strong>
              <span style="display: block; font-size: 0.7rem; color: var(--text-dim); font-family: var(--font-mono);">
                ${isRequired ? 'Obrigatório' : 'Etapa posterior (Opcional)'} • Regra fixa: ${fieldDef.key}
              </span>
            </td>
            <td>
              ${
                isMapped
                  ? `<code style="font-family: var(--font-mono); font-size: 0.85rem; font-weight: 700; color: ${
                      isManual ? 'var(--accent-warning)' : 'var(--text-main)'
                    }; background: var(--surface-2); padding: 0.25rem 0.5rem; border-radius: 4px; border: 1px solid var(--border-subtle);">${currentMapped}</code>`
                  : isRequired
                    ? `<span style="color: var(--accent-danger); font-size: 0.85rem; font-style: italic;">— Não identificada</span>`
                    : `<span style="color: var(--text-muted); font-size: 0.85rem; font-style: italic;">— Não disponível na planilha</span>`
              }
            </td>
            <td>
              ${
                isMapped
                  ? isManual
                    ? `<span class="status-pill warning"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg> Manual</span>`
                    : `<span class="status-pill success"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Automático</span>`
                  : isRequired
                    ? `<span class="status-pill danger"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg> Pendente</span>`
                    : `<span class="status-pill neutral" style="opacity: 0.85;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="8" y1="12" x2="16" y2="12"></line></svg> Opcional</span>`
              }
            </td>
            <td style="text-align: right;">
              <button type="button" class="btn ${isMapped ? 'btn-secondary' : isRequired ? 'btn-primary' : 'btn-secondary'} btn-sm btn-open-picker"
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
   * Formats evidence items from Participação into readable text or HTML badges (never [object Object])
   * @param {Array<Object|string>} evidenciasList
   * @param {boolean} [isHtml=false]
   * @returns {string}
   */
  formatEvidenciasParticipacao(evidenciasList, isHtml = false) {
    if (!evidenciasList || evidenciasList.length === 0) {
      return isHtml
        ? '<span style="color: var(--text-muted); font-style: italic;">Nenhuma turma com identificador específico encontrada na base de Participação</span>'
        : 'Nenhuma turma explícita';
    }

    if (isHtml) {
      return evidenciasList
        .map((e) => {
          if (typeof e === 'object' && e) {
            const turma = e.turma || 'Turma sem código';
            const pres =
              e.presentes !== undefined && e.presentes !== null
                ? `<span style="color: var(--accent-success); font-weight: 600; margin-left: 0.25rem;">(${e.presentes} presente${e.presentes !== 1 ? 's' : ''})</span>`
                : '';
            const esc =
              e.escolaOrigem && e.escolaOrigem !== 'SENAI - ITED'
                ? `<span style="color: var(--text-muted); font-size: 0.75rem; margin-left: 0.25rem;">[${e.escolaOrigem}]</span>`
                : '';
            return `<span style="display: inline-block; background: var(--surface-2); padding: 0.2rem 0.5rem; border-radius: 4px; border: 1px solid var(--border-subtle); margin-right: 0.35rem; margin-bottom: 0.35rem;"><code>${turma}</code>${pres}${esc}</span>`;
          }
          return `<span style="display: inline-block; background: var(--surface-2); padding: 0.2rem 0.5rem; border-radius: 4px; border: 1px solid var(--border-subtle); margin-right: 0.35rem; margin-bottom: 0.35rem;"><code>${e}</code></span>`;
        })
        .join('');
    }

    return evidenciasList
      .map((e) => {
        if (typeof e === 'object' && e) {
          const turma = e.turma || 'Turma sem código';
          const pres =
            e.presentes !== undefined && e.presentes !== null ? ` (${e.presentes} presentes)` : '';
          const esc =
            e.escolaOrigem && e.escolaOrigem !== 'SENAI - ITED' ? ` [${e.escolaOrigem}]` : '';
          return `${turma}${pres}${esc}`;
        }
        return String(e);
      })
      .join(', ');
  }

  /**
   * Shows an integrated toast notification
   * @param {string} message
   * @param {'success'|'info'|'warning'|'danger'} [type='info']
   * @param {string|null} [title=null]
   * @param {number} [duration=4500]
   */
  showToast(message, type = 'info', title = null, duration = 4500) {
    if (!this.toastContainer) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.setAttribute('role', 'alert');

    let iconSVG = '';
    let defaultTitle = '';

    if (type === 'success') {
      defaultTitle = 'Sucesso';
      iconSVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
    } else if (type === 'warning') {
      defaultTitle = 'Atenção';
      iconSVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;
    } else if (type === 'danger') {
      defaultTitle = 'Erro';
      iconSVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`;
    } else {
      defaultTitle = 'Informação';
      iconSVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
    }

    const finalTitle = title || defaultTitle;

    toast.innerHTML = `
      <div class="toast-icon">${iconSVG}</div>
      <div class="toast-body">
        <div class="toast-title">${finalTitle}</div>
        <div class="toast-message">${message}</div>
      </div>
      <button type="button" class="toast-close" aria-label="Fechar notificação">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    `;

    const closeBtn = toast.querySelector('.toast-close');
    const removeToast = () => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.25s ease';
      setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 250);
    };

    closeBtn.addEventListener('click', removeToast);

    this.toastContainer.appendChild(toast);

    if (duration > 0) {
      setTimeout(removeToast, duration);
    }
  }

  /**
   * Opens Reset Confirmation Modal
   */
  openResetModal() {
    if (this.modalConfirmReset) {
      this.modalConfirmReset.classList.add('active');
      this.modalConfirmReset.setAttribute('aria-hidden', 'false');
    }
  }

  /**
   * Closes Reset Confirmation Modal
   */
  closeResetModal() {
    if (this.modalConfirmReset) {
      this.modalConfirmReset.classList.remove('active');
      this.modalConfirmReset.setAttribute('aria-hidden', 'true');
    }
  }

  /**
   * Render dynamic pre-consolidation summary in Step 3
   */
  renderPreConsolidationSummary() {
    if (!this.preConsolidationSummary) return;

    if (this.selectedModelId === 'prova-pratica') {
      const part = this.loadedFiles.participacao;
      const est = this.loadedFiles.estudantes;
      const partRows = part?.rows?.length || 0;
      const estRows = est?.rows?.length || 0;

      let homologadosCount = 0;
      let provasGeradasCount = 0;
      let tabuladasCount = 0;
      const hasProvaField = !!(est && est.mappings && est.mappings.PROVA_GERADA);
      const hasTabField = !!(est && est.mappings && est.mappings.TABULACAO);

      if (est && est.rows) {
        const homField = est.mappings?.HOMOLOGADO || 'HOMOLOGADO';
        const provaField = est.mappings?.PROVA_GERADA;
        const tabField = est.mappings?.TABULACAO;
        est.rows.forEach((r) => {
          const hom = String(r[homField] || '').trim().toUpperCase();
          const prov = provaField ? String(r[provaField] || '').trim().toUpperCase() : '';
          const tab = tabField ? String(r[tabField] || '').trim().toUpperCase() : '';
          if (hom === 'SIM') {
            homologadosCount++;
            if (tab === 'SIM') tabuladasCount++;
          }
          if (prov === 'SIM') provasGeradasCount++;
        });
      }

      this.preConsolidationSummary.innerHTML = `
        <div class="pre-summary-card">
          <div class="pre-summary-header">
            <div class="pre-summary-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
              Resumo dos Dados Carregados (Prova Prática)
            </div>
            <span class="status-pill info" style="font-size: 0.75rem;">Cálculo Dinâmico</span>
          </div>
          <div class="pre-summary-grid">
            <div class="pre-summary-item">
              <span class="pre-summary-item-label">Participação (Turmas & Presentes)</span>
              <span class="pre-summary-item-value">${partRows.toLocaleString('pt-BR')} <span style="font-size: 0.75rem; font-weight: normal; color: var(--text-muted);">registros</span></span>
            </div>
            <div class="pre-summary-item">
              <span class="pre-summary-item-label">Estudantes (Base de Alunos)</span>
              <span class="pre-summary-item-value">${estRows.toLocaleString('pt-BR')} <span style="font-size: 0.75rem; font-weight: normal; color: var(--text-muted);">registros</span></span>
            </div>
            <div class="pre-summary-item">
              <span class="pre-summary-item-label">Alunos Homologados</span>
              <span class="pre-summary-item-value" style="color: var(--accent-success);">${homologadosCount.toLocaleString('pt-BR')} <span style="font-size: 0.75rem; font-weight: normal; color: var(--text-muted);">alunos</span></span>
            </div>
            <div class="pre-summary-item">
              <span class="pre-summary-item-label">Provas Geradas (Estudantes)</span>
              <span class="pre-summary-item-value" style="color: var(--accent-primary);">${
                hasProvaField
                  ? `${provasGeradasCount.toLocaleString('pt-BR')} <span style="font-size: 0.75rem; font-weight: normal; color: var(--text-muted);">provas</span>`
                  : '<span style="color: var(--text-muted); font-size: 0.85rem; font-weight: normal;">— (Etapa posterior)</span>'
              }</span>
            </div>
            <div class="pre-summary-item">
              <span class="pre-summary-item-label">Tabulação Realizada (Homologados)</span>
              <span class="pre-summary-item-value">${
                hasTabField
                  ? `${tabuladasCount.toLocaleString('pt-BR')} <span style="font-size: 0.75rem; font-weight: normal; color: var(--text-muted);">tabulados</span>`
                  : '<span style="color: var(--text-muted); font-size: 0.85rem; font-weight: normal;">— (Etapa posterior)</span>'
              }</span>
            </div>
          </div>
        </div>
      `;
      return;
    }

    const aptos = this.loadedFiles.aptos;
    const chp = this.loadedFiles.matriculados_chp;
    const iftp = this.loadedFiles.matriculados_iftp;
    const part = this.loadedFiles.participacao;

    const aptosCount = aptos?.rows?.length || 0;
    const chpCount = chp?.rows?.length || 0;
    const iftpCount = iftp?.rows?.length || 0;
    const partCount = part?.rows?.length || 0;

    // Calculate distinct turmas in Aptos dynamically
    let turmasIdentificadas = 0;
    if (aptos && aptos.rows && aptos.rows.length > 0) {
      const turmaField = aptos.mappings?.TURMADESCRICAO || 'TURMADESCRICAO';
      const escolaField = aptos.mappings?.ESCOLA || 'ESCOLA';
      const cursoField = aptos.mappings?.CURSO || 'CURSO';
      const uniqueKeys = new Set();
      aptos.rows.forEach((r) => {
        const t = String(r[turmaField] || '').trim();
        const e = String(r[escolaField] || '').trim();
        const c = String(r[cursoField] || '').trim();
        if (t) uniqueKeys.add(`${e}__${c}__${t}`);
      });
      turmasIdentificadas = uniqueKeys.size;
    }

    this.preConsolidationSummary.innerHTML = `
      <div class="pre-summary-card">
        <div class="pre-summary-header">
          <div class="pre-summary-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            Resumo dos Dados Carregados (Pronto para Consolidar)
          </div>
          <span class="status-pill info" style="font-size: 0.75rem;">Cálculo Dinâmico</span>
        </div>
        <div class="pre-summary-grid">
          <div class="pre-summary-item">
            <span class="pre-summary-item-label">Aptos (Base Principal)</span>
            <span class="pre-summary-item-value">${aptosCount.toLocaleString('pt-BR')} <span style="font-size: 0.75rem; font-weight: normal; color: var(--text-muted);">registros</span></span>
          </div>
          <div class="pre-summary-item">
            <span class="pre-summary-item-label">Matriculados CHP</span>
            <span class="pre-summary-item-value">${chpCount.toLocaleString('pt-BR')} <span style="font-size: 0.75rem; font-weight: normal; color: var(--text-muted);">registros</span></span>
          </div>
          <div class="pre-summary-item">
            <span class="pre-summary-item-label">Matriculados IFTP</span>
            <span class="pre-summary-item-value">${iftpCount.toLocaleString('pt-BR')} <span style="font-size: 0.75rem; font-weight: normal; color: var(--text-muted);">registros</span></span>
          </div>
          <div class="pre-summary-item">
            <span class="pre-summary-item-label">Participação</span>
            <span class="pre-summary-item-value">${
              part
                ? `${partCount.toLocaleString('pt-BR')} <span style="font-size: 0.75rem; font-weight: normal; color: var(--text-muted);">registros</span>`
                : '<span style="color: var(--text-muted); font-size: 0.85rem; font-weight: normal;">Não enviado (Opcional)</span>'
            }</span>
          </div>
          <div class="pre-summary-item">
            <span class="pre-summary-item-label">Turmas Identificadas (Aptos)</span>
            <span class="pre-summary-item-value" style="color: var(--accent-primary);">${turmasIdentificadas.toLocaleString('pt-BR')} <span style="font-size: 0.75rem; font-weight: normal; color: var(--text-muted);">turmas</span></span>
          </div>
        </div>
      </div>
    `;
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
      this.showToast('Por favor, selecione uma coluna antes de confirmar.', 'warning', 'Seleção Pendente');
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
    this.showToast(`Coluna "${selectedColumn}" associada com sucesso.`, 'success', 'Coluna Mapeada');
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

      // Flag rows with warnings for UI filtering & highlighting
      const warningsList = this.macroResult.warnings || [];
      this.macroResult.rows.forEach((row) => {
        if (this.selectedModelId === 'prova-objetiva') {
          const isZeroEnrolled = row['Alunos'] === 0;
          const mentionedInWarning = warningsList.some(
            (w) => w.includes(`"${row['Turma']}"`) && w.includes(row['Unidade operacional (Escola)'])
          );
          row._hasWarning = !row._isManualAssociation && (isZeroEnrolled || mentionedInWarning);
        }
      });

      this.renderKPIs();
      this.renderWarnings();
      this.renderPreviewTableHeader();
      this.renderPreviewTableRows();

      this.goToStep(4);
      this.showToast('Macrodado consolidado com sucesso!', 'success', 'Consolidação Concluída');
    } catch (err) {
      console.error('Erro no processamento:', err);
      this.showToast(`Erro durante o processamento do macro: ${err.message}`, 'danger', 'Erro no Processamento');
    }
  }

  /**
   * Recalculates the macro dataset with active manual overrides without reload
   */
  recalculateMacroResult() {
    try {
      const model = ModelRegistry.getModelById(this.selectedModelId);
      this.macroResult = model.process(this.loadedFiles);

      // Flag rows with warnings for UI filtering & highlighting
      const warningsList = this.macroResult.warnings || [];
      this.macroResult.rows.forEach((row) => {
        if (this.selectedModelId === 'prova-objetiva') {
          const isZeroEnrolled = row['Alunos'] === 0;
          const mentionedInWarning = warningsList.some(
            (w) => w.includes(`"${row['Turma']}"`) && w.includes(row['Unidade operacional (Escola)'])
          );
          row._hasWarning = !row._isManualAssociation && (isZeroEnrolled || mentionedInWarning);
        }
      });

      this.renderKPIs();
      this.renderWarnings();
      this.renderPreviewTableRows();
    } catch (err) {
      console.error('Erro no recálculo:', err);
      this.showToast(`Erro ao recalcular macrodado: ${err.message}`, 'danger', 'Erro no Recálculo');
    }
  }

  /**
   * Render KPI summary cards
   */
  renderKPIs() {
    const stats = this.macroResult.stats || this.macroResult.kpis || {};

    let kpiData = [];
    if (this.selectedModelId === 'prova-pratica') {
      kpiData = [
        { title: 'Chaves Consolidadas', value: (stats.totalLinhas || 0).toLocaleString('pt-BR'), highlight: true },
        { title: 'Prova Objetiva (Presentes)', value: (stats.totalProvaObjetiva || 0).toLocaleString('pt-BR') },
        { title: 'Alunos Homologados', value: (stats.totalHomologados || 0).toLocaleString('pt-BR'), highlight: true },
        { title: 'Provas Aplicadas', value: (stats.totalAplicadas || 0).toLocaleString('pt-BR') },
        { title: 'Provas Não Aplicadas', value: (stats.totalNaoAplicadas || 0).toLocaleString('pt-BR') },
        { title: 'Total de Provas Geradas', value: (stats.totalProvasGeradas || 0).toLocaleString('pt-BR') },
        { title: 'Tabulação Feita', value: (stats.totalTabuladas || 0).toLocaleString('pt-BR') },
        { title: 'Tabulação Pendente', value: (stats.totalTabPendente || 0).toLocaleString('pt-BR') },
        { title: 'Confirmação Feita', value: (stats.totalConfirmadas || 0).toLocaleString('pt-BR') },
        { title: 'Confirmação Pendente', value: (stats.totalConfPendente || 0).toLocaleString('pt-BR') }
      ];
    } else {
      kpiData = [
        { title: 'Total de Registros', value: (stats.totalTurmas || 0).toLocaleString('pt-BR'), highlight: true },
        { title: 'Total de Alunos', value: (stats.totalMatriculados || 0).toLocaleString('pt-BR') },
        { title: 'Alunos Aptos/Agendados', value: (stats.totalAptosAgendados || 0).toLocaleString('pt-BR') },
        { title: 'Inaptos/Não Agendados', value: (stats.totalInaptosNaoAgendados || 0).toLocaleString('pt-BR') },
        { title: 'Presentes', value: (stats.totalPresentes || 0).toLocaleString('pt-BR') },
        { title: 'Ausentes', value: (stats.totalAusentes || 0).toLocaleString('pt-BR') },
        { title: 'Taxa de Presença', value: stats.taxaPresencaGeral || '0.0%', highlight: true }
      ];
    }

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
   * Render warnings alert banner with structured discrepancies and investigation actions
   */
  renderWarnings() {
    const discrepancies = this.macroResult.discrepancies || [];
    const pendingDiscrepancies = discrepancies.filter((d) => !d.isResolved);
    const resolvedDiscrepancies = discrepancies.filter((d) => d.isResolved);
    const generalWarnings = this.macroResult.warnings || [];

    if (discrepancies.length === 0 && generalWarnings.length === 0) {
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
            <div>Todas as bases foram consolidadas com correspondência completa e sem pendências.</div>
          </div>
        </div>
      `;
      return;
    }

    let bannerHTML = `
      <div class="alert-banner ${pendingDiscrepancies.length > 0 ? 'warning' : 'info'}">
        <div class="alert-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
        </div>
        <div class="alert-content">
          <div class="alert-title" style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem;">
            <span>
              ${
                pendingDiscrepancies.length > 0
                  ? `Divergências / Decisões para Conferência (${pendingDiscrepancies.length} pendente${pendingDiscrepancies.length > 1 ? 's' : ''}${
                      resolvedDiscrepancies.length > 0 ? `, ${resolvedDiscrepancies.length} resolvida(s) manualmente` : ''
                    })`
                  : `Todas as decisões manuais foram registradas (${resolvedDiscrepancies.length})`
              }
            </span>
          </div>
          <div style="font-size: 0.8rem; color: var(--text-muted); margin: 0.35rem 0 0.75rem 0;">
            Nenhuma associação ou atribuição ambígua foi forçada silenciosamente. O usuário pode conferir as evidências e registrar a decisão.
          </div>
          <div style="display: flex; flex-direction: column; gap: 0.5rem;">
    `;

    discrepancies.forEach((disc) => {
      // Prova Prática: Salvador ITED Ambiguity
      if (disc.type === 'salvador_ited_ambiguity') {
        const discId = disc.id;
        const src = disc.source;
        const isResolved = disc.isResolved;

        bannerHTML += `
          <div class="discrepancy-alert-item">
            <div>
              <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                <span class="status-pill warning" style="font-weight: 700;">Salvador • ITED</span>
                <strong style="color: var(--text-main); font-size: 0.85rem;">${src.curso}</strong>
                <span style="color: var(--text-muted); font-size: 0.8rem;">&bull; ${src.estudantesCount} aluno(s)</span>
                ${
                  isResolved
                    ? `<span class="status-pill manual" style="font-size: 0.7rem;">Decisão Manual: ${disc.resolution}</span>`
                    : `<span class="status-pill danger" style="font-size: 0.7rem;">Ambiguidade Pendente</span>`
                }
              </div>
              <div style="font-size: 0.75rem; color: var(--text-dim); margin-top: 0.2rem;">
                ${
                  isResolved
                    ? `Consolidado na unidade <strong>${disc.resolution}</strong> por decisão do usuário.`
                    : `Existe ambiguidade entre <strong>SENAI CIMATEC</strong> e <strong>SENAI Dendezeiros</strong>. Evidências na Participação: <em>${this.formatEvidenciasParticipacao(src.evidenciasParticipacao, false)}</em>.`
                }
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 0.5rem; flex-shrink: 0;">
              <button type="button" class="btn ${isResolved ? 'btn-resolved-manual' : 'btn-investigate'} btn-open-discrepancy" data-group="${discId}">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                ${isResolved ? 'Alterar' : 'Resolver'}
              </button>
              ${
                isResolved
                  ? `<button type="button" class="btn btn-ghost btn-sm btn-undo-discrepancy" data-group="${discId}" title="Desfazer decisão manual" style="font-size: 0.75rem; color: var(--accent-danger);">
                       Desfazer
                     </button>`
                  : ''
              }
            </div>
          </div>
        `;
        return;
      }

      // Prova Objetiva Discrepancies
      const src = disc.source;
      const isResolved = disc.isResolved;

      bannerHTML += `
        <div class="discrepancy-alert-item">
          <div>
            <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
              <code style="font-family: var(--font-mono); font-size: 0.85rem; font-weight: 700; color: var(--text-main); background: var(--surface-3); padding: 0.15rem 0.45rem; border-radius: 4px;">
                ${src.turmaNormalizada}
              </code>
              <strong style="color: var(--text-main); font-size: 0.85rem;">${src.unidade}</strong>
              <span style="color: var(--text-muted); font-size: 0.8rem;">&bull; ${src.curso}</span>
              ${
                isResolved
                  ? `<span class="status-pill manual" style="font-size: 0.7rem;">Associação manual (${disc.manualOverride.targetCategory} • ${disc.manualOverride.matriculadosCount} alunos)</span>`
                  : `<span class="status-pill warning" style="font-size: 0.7rem;">Pendente (${src.aptosCount} apto(s))</span>`
              }
            </div>
            <div style="font-size: 0.75rem; color: var(--text-dim); margin-top: 0.2rem;">
              ${
                isResolved
                  ? `Associado à turma matriculada <code style="font-family: var(--font-mono);">${disc.manualOverride.targetTurmaCode}</code> (${disc.manualOverride.targetUnidade})`
                  : `Sem correspondência automática nas bases CHP / IFTP.`
              }
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 0.5rem; flex-shrink: 0;">
            <button type="button" class="btn ${isResolved ? 'btn-resolved-manual' : 'btn-investigate'} btn-open-discrepancy" data-group="${disc.groupKey}">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              ${isResolved ? 'Alterar' : 'Investigar'}
            </button>
            ${
              isResolved
                ? `<button type="button" class="btn btn-ghost btn-sm btn-undo-discrepancy" data-group="${disc.groupKey}" title="Desfazer associação manual" style="font-size: 0.75rem; color: var(--accent-danger);">
                     Desfazer
                   </button>`
                : ''
            }
          </div>
        </div>
      `;
    });

    // If there are general warnings without interactive discrepancies
    if (discrepancies.length === 0 && generalWarnings.length > 0) {
      generalWarnings.forEach((w) => {
        bannerHTML += `
          <div class="discrepancy-alert-item" style="padding: 0.5rem 0.75rem;">
            <div style="font-size: 0.8rem; color: var(--text-main);">
              ℹ ${w}
            </div>
          </div>
        `;
      });
    }

    bannerHTML += `
          </div>
        </div>
      </div>
    `;

    this.warningsContainer.innerHTML = bannerHTML;

    // Attach click events to investigation and undo buttons
    this.warningsContainer.querySelectorAll('.btn-open-discrepancy').forEach((btn) => {
      btn.addEventListener('click', () => {
        const groupKey = btn.getAttribute('data-group');
        this.openDiscrepancyModal(groupKey, btn);
      });
    });

    this.warningsContainer.querySelectorAll('.btn-undo-discrepancy').forEach((btn) => {
      btn.addEventListener('click', () => {
        const groupKey = btn.getAttribute('data-group');
        this.undoManualAssociation(groupKey);
      });
    });
  }

  /**
   * Render Preview Table Headers (13 or 18 columns)
   */
  renderPreviewTableHeader() {
    this.macroTableHeaderRow.innerHTML = this.macroResult.columns
      .map((col, idx) => `<th>${idx + 1}. ${col}</th>`)
      .join('');
  }

  /**
   * Render Preview Table Rows with search, tab filtering, and discrepancy actions
   */
  renderPreviewTableRows() {
    if (!this.macroResult || !this.macroResult.rows) return;

    const allRows = this.macroResult.rows;
    const warningRowsCount = allRows.filter((r) => r._hasWarning).length;

    if (this.countAllRows) this.countAllRows.textContent = allRows.length.toLocaleString('pt-BR');
    if (this.countWarningRows) this.countWarningRows.textContent = warningRowsCount.toLocaleString('pt-BR');

    if (this.filterTabWarnings) {
      this.filterTabWarnings.style.display = warningRowsCount > 0 ? 'inline-flex' : 'none';
    }

    let filtered = allRows;

    // Filter by tab
    if (this.activeFilterTab === 'warning') {
      filtered = filtered.filter((r) => r._hasWarning);
    }

    // Filter by search query
    if (this.filterQuery) {
      filtered = filtered.filter((row) => {
        const u = String(row['Unidade operacional (Escola)'] || '').toLowerCase();
        const c = String(row['Curso'] || '').toLowerCase();
        const m = String(row['Modalidade'] || '').toLowerCase();
        const cat = String(row['Categoria'] || '').toLowerCase();
        const t = String(row['Turma'] || '').toLowerCase();
        return (
          u.includes(this.filterQuery) ||
          c.includes(this.filterQuery) ||
          m.includes(this.filterQuery) ||
          cat.includes(this.filterQuery) ||
          t.includes(this.filterQuery)
        );
      });
    }

    this.tableRowCountLabel.textContent = `Exibindo ${filtered.length.toLocaleString('pt-BR')} de ${allRows.length.toLocaleString('pt-BR')} registros`;

    const isPP = this.selectedModelId === 'prova-pratica';
    const totalCols = isPP ? 18 : 13;

    if (filtered.length === 0) {
      this.macroTableBody.innerHTML = `
        <tr>
          <td colspan="${totalCols}" style="text-align: center; padding: 2.5rem; color: var(--text-dim);">
            ${
              this.activeFilterTab === 'warning'
                ? 'Nenhum registro com aviso de inconsistência pendente.'
                : `Nenhum registro encontrado para o filtro "${this.filterQuery}".`
            }
          </td>
        </tr>
      `;
      return;
    }

    if (isPP) {
      this.macroTableBody.innerHTML = filtered
        .map((row) => {
          const hasWarning = !!row._hasWarning;
          return `
            <tr class="${hasWarning ? 'row-has-warning' : ''}">
              <td><span style="font-weight: 600; color: var(--text-muted);">${row['Departamento Regional (DR)']}</span></td>
              <td><strong>${row['Unidade operacional (Escola)']}</strong></td>
              <td>${row['Curso']}</td>
              <td>
                <span class="status-pill ${row['Modalidade'] === 'Semi-presencial' ? 'info' : 'success'}">
                  ${row['Modalidade']}
                </span>
              </td>
              <td style="text-align: right; font-weight: 600;">${row['Prova Objetiva']}</td>
              <td style="text-align: right; font-weight: 700; color: var(--accent-success);">${row['Alunos Homologados']}</td>
              <td style="text-align: right;">${row['Provas Aplicadas']}</td>
              <td style="text-align: right; font-weight: 600;">${row['Provas Aplicadas (%)']}</td>
              <td style="text-align: right;">${row['Provas Não Aplicadas']}</td>
              <td style="text-align: right; font-weight: 600;">${row['Provas Não Aplicadas (%)']}</td>
              <td style="text-align: right; font-weight: 700;">${row['Total de Provas Geradas']}</td>
              <td style="text-align: right;">${row['Tabulação Feita']}</td>
              <td style="text-align: right; font-weight: 600;">${row['Tabulação Feita (%)']}</td>
              <td style="text-align: right;">${row['Tabulação Pendente']}</td>
              <td style="text-align: right; font-weight: 600;">${row['Tabulação Pendente (%)']}</td>
              <td style="text-align: right; font-weight: 700;">${row['Total de Tabulação']}</td>
              <td style="text-align: right;">${row['Confirmação Feita']}</td>
              <td style="text-align: right;">${row['Confirmação Pendente']}</td>
            </tr>
          `;
        })
        .join('');
      return;
    }

    this.macroTableBody.innerHTML = filtered
      .map((row) => {
        const hasWarning = !!row._hasWarning;
        const isManual = !!row._isManualAssociation;

        return `
          <tr class="${hasWarning ? 'row-has-warning' : ''}">
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
            <td>
              <div style="display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap;">
                <code style="font-family: var(--font-mono); font-size: 0.8rem;">${row['Turma']}</code>
                ${
                  isManual
                    ? `<span class="status-pill manual" style="font-size: 0.6875rem; padding: 0.1rem 0.4rem;" title="Associação manual ativa">Manual</span>`
                    : ''
                }
                ${
                  hasWarning
                    ? `<button type="button" class="btn-investigate btn-table-investigate" data-group="${row._groupKey}" title="Investigar divergência nas bases">
                        ⚠ Investigar
                       </button>`
                    : isManual
                    ? `<button type="button" class="btn-resolved-manual btn-table-investigate" data-group="${row._groupKey}" title="Alterar associação manual" style="font-size: 0.7rem; padding: 0.15rem 0.4rem;">
                        Alterar
                       </button>`
                    : ''
                }
              </div>
            </td>
            <td style="font-weight: 700; text-align: right; ${row['Alunos'] === 0 ? 'color: var(--accent-danger);' : ''}">${row['Alunos']}</td>
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

    // Attach click events to table investigate buttons
    this.macroTableBody.querySelectorAll('.btn-table-investigate').forEach((btn) => {
      btn.addEventListener('click', () => {
        const groupKey = btn.getAttribute('data-group');
        this.openDiscrepancyModal(groupKey, btn);
      });
    });
  }

  /**
   * Opens Discrepancy Resolution Modal with source metadata and candidate discovery
   * @param {string} groupKey 
   * @param {HTMLElement|null} [triggerEl=null] 
   */
  openDiscrepancyModal(groupKey, triggerEl = null) {
    if (!this.macroResult) return;
    this.lastFocusedElement = triggerEl || document.activeElement;

    const disc = (this.macroResult.discrepancies || []).find((d) => d.id === groupKey || d.groupKey === groupKey);
    if (!disc) {
      this.showToast('Detalhes da divergência não encontrados.', 'warning', 'Atenção');
      return;
    }

    this.discrepancyState = {
      activeGroupKey: groupKey,
      activeDiscrepancy: disc,
      selectedCandidate: null,
      searchQuery: ''
    };

    if (disc.type === 'salvador_ited_ambiguity') {
      const src = disc.source;
      this.modalDiscrepancyTitle.textContent = `Resolver Ambiguidade — Salvador / ITED`;
      this.modalDiscrepancySubtitle.textContent = `Curso: ${src.curso}`;

      this.discrepancySourceContainer.innerHTML = `
        <div class="discrepancy-source-header">
          <span class="discrepancy-source-title">Dados de Origem (Base Estudantes & Participação)</span>
          <span class="status-pill ${disc.isResolved ? 'manual' : 'warning'}">
            ${disc.isResolved ? `Resolvido (${disc.resolution})` : 'Decisão Pendente'}
          </span>
        </div>
        <div class="discrepancy-source-grid">
          <div class="discrepancy-source-field">
            <span class="discrepancy-source-label">Escola Original</span>
            <span class="discrepancy-source-value">${src.escola}</span>
          </div>
          <div class="discrepancy-source-field">
            <span class="discrepancy-source-label">Município</span>
            <span class="discrepancy-source-value">${src.municipio}</span>
          </div>
          <div class="discrepancy-source-field">
            <span class="discrepancy-source-label">Curso</span>
            <span class="discrepancy-source-value">${src.curso}</span>
          </div>
          <div class="discrepancy-source-field">
            <span class="discrepancy-source-label">Modalidade</span>
            <span class="discrepancy-source-value">${src.modalidade}</span>
          </div>
          <div class="discrepancy-source-field">
            <span class="discrepancy-source-label">Quantidade de Alunos</span>
            <span class="discrepancy-source-value" style="color: var(--accent-success); font-weight: 700;">${src.estudantesCount} aluno(s)</span>
          </div>
          <div class="discrepancy-source-field" style="grid-column: 1 / -1;">
            <span class="discrepancy-source-label">Códigos de Turma Encontrados na Participação (Evidências)</span>
            <div class="discrepancy-source-value" style="margin-top: 0.25rem;">
              ${this.formatEvidenciasParticipacao(src.evidenciasParticipacao, true)}
            </div>
          </div>
        </div>
      `;

      this.discrepancyDiagnosticText.innerHTML = `
        Registros de ITED em Salvador podem pertencer a <strong>SENAI CIMATEC</strong> ou <strong>SENAI Dendezeiros</strong>. O sistema não assume uma escolha automaticamente. Selecione a unidade correta abaixo com base nas evidências.
      `;

      if (disc.isResolved) {
        this.btnDiscrepancyUndo.style.display = 'inline-flex';
      } else {
        this.btnDiscrepancyUndo.style.display = 'none';
      }

      if (this.discrepancyConflictBanner) this.discrepancyConflictBanner.style.display = 'none';
      if (this.discrepancySearchInput) this.discrepancySearchInput.value = '';

      this.renderDiscrepancyCandidates();

      this.modalResolveDiscrepancy.classList.add('active');
      this.modalResolveDiscrepancy.setAttribute('aria-hidden', 'false');
      return;
    }

    const src = disc.source;

    this.modalDiscrepancyTitle.textContent = `Resolver Divergência — Turma ${src.turmaNormalizada}`;
    this.modalDiscrepancySubtitle.textContent = `Origem: ${src.unidade} • ${src.curso}`;

    // Render Source Metadata Box (Section 5)
    this.discrepancySourceContainer.innerHTML = `
      <div class="discrepancy-source-header">
        <span class="discrepancy-source-title">Dados Encontrados nos Aptos (Base Principal)</span>
        <span class="status-pill ${disc.isResolved ? 'manual' : 'warning'}">
          ${disc.isResolved ? 'Associação Manual Ativa' : 'Não Associada'}
        </span>
      </div>
      <div class="discrepancy-source-grid">
        <div class="discrepancy-source-field">
          <span class="discrepancy-source-label">Unidade Operacional</span>
          <span class="discrepancy-source-value">${src.unidade}</span>
        </div>
        <div class="discrepancy-source-field">
          <span class="discrepancy-source-label">Curso</span>
          <span class="discrepancy-source-value">${src.curso}</span>
        </div>
        <div class="discrepancy-source-field">
          <span class="discrepancy-source-label">Turma (Código Normalizado)</span>
          <span class="discrepancy-source-value"><code style="font-family: var(--font-mono); font-size: 0.9rem;">${src.turmaNormalizada}</code></span>
        </div>
        <div class="discrepancy-source-field">
          <span class="discrepancy-source-label">Descrição Original</span>
          <span class="discrepancy-source-value" style="color: var(--text-muted); font-size: 0.8rem;">${src.turmaOriginal || '—'}</span>
        </div>
        <div class="discrepancy-source-field">
          <span class="discrepancy-source-label">Modalidade</span>
          <span class="discrepancy-source-value">${src.modalidade}</span>
        </div>
        <div class="discrepancy-source-field">
          <span class="discrepancy-source-label">Quantidade de Aptos</span>
          <span class="discrepancy-source-value" style="color: var(--accent-success);">${src.aptosCount} estudante(s)</span>
        </div>
        <div class="discrepancy-source-field">
          <span class="discrepancy-source-label">Arquivo de Origem</span>
          <span class="discrepancy-source-value" style="font-size: 0.775rem;">${src.fileName || 'Aptos'}</span>
        </div>
        <div class="discrepancy-source-field">
          <span class="discrepancy-source-label">Aba Utilizada</span>
          <span class="discrepancy-source-value" style="font-size: 0.775rem;">${src.sheetName || 'Estudante'}</span>
        </div>
      </div>
    `;

    // Diagnostic Box (Section 6)
    this.discrepancyDiagnosticText.innerHTML = `
      Nenhuma correspondência automática foi encontrada nas bases de Matriculados utilizando <strong>Unidade + Curso + Turma normalizada</strong>.
    `;

    // Toggle Undo button based on resolution state
    if (disc.isResolved) {
      this.btnDiscrepancyUndo.style.display = 'inline-flex';
    } else {
      this.btnDiscrepancyUndo.style.display = 'none';
    }

    if (this.discrepancyConflictBanner) {
      this.discrepancyConflictBanner.style.display = 'none';
    }

    if (this.discrepancySearchInput) {
      this.discrepancySearchInput.value = '';
    }

    this.renderDiscrepancyCandidates();

    this.modalResolveDiscrepancy.classList.add('active');
    this.modalResolveDiscrepancy.setAttribute('aria-hidden', 'false');

    if (this.discrepancySearchInput) {
      setTimeout(() => this.discrepancySearchInput.focus(), 150);
    }
  }

  /**
   * Closes Discrepancy Resolution Modal
   */
  closeDiscrepancyModal() {
    if (this.modalResolveDiscrepancy) {
      this.modalResolveDiscrepancy.classList.remove('active');
      this.modalResolveDiscrepancy.setAttribute('aria-hidden', 'true');
    }
    this.discrepancyState = {
      activeGroupKey: null,
      activeDiscrepancy: null,
      selectedCandidate: null,
      searchQuery: ''
    };
    if (this.lastFocusedElement && typeof this.lastFocusedElement.focus === 'function') {
      this.lastFocusedElement.focus();
    }
  }

  /**
   * Renders candidates in discrepancy modal, checking conflicts and live search filters
   */
  renderDiscrepancyCandidates() {
    const disc = this.discrepancyState.activeDiscrepancy;
    if (!disc) return;

    if (disc.type === 'salvador_ited_ambiguity') {
      const candidates = disc.candidates || [];
      this.discrepancyCandidatesCountBadge.textContent = `${candidates.length} opções disponíveis`;

      this.discrepancyCandidatesList.innerHTML = candidates
        .map((cand) => {
          const isSelected =
            (this.discrepancyState.selectedCandidate && this.discrepancyState.selectedCandidate.id === cand.id) ||
            (disc.resolution === cand.id);

          return `
            <label class="candidate-card ${isSelected ? 'selected' : ''}" data-candidate-id="${cand.id}">
              <input type="radio" name="discrepancyCandidateRadio" value="${cand.id}" ${isSelected ? 'checked' : ''}>
              <div class="candidate-info">
                <div class="candidate-top-row">
                  <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <strong style="font-size: 0.95rem; color: var(--text-main);">${cand.unidade}</strong>
                    ${cand.isRecommended ? '<span class="status-pill success" style="font-size: 0.7rem;">Sugerido por evidência</span>' : ''}
                  </div>
                </div>
                <div class="candidate-meta-row" style="margin-top: 0.25rem; font-size: 0.8rem; color: var(--text-muted);">
                  ${cand.descricao || cand.unidade}
                </div>
              </div>
            </label>
          `;
        })
        .join('');

      this.discrepancyCandidatesList.querySelectorAll('.candidate-card').forEach((card) => {
        card.addEventListener('click', () => {
          this.discrepancyCandidatesList.querySelectorAll('.candidate-card').forEach((c) => c.classList.remove('selected'));
          card.classList.add('selected');
          const input = card.querySelector('input[type="radio"]');
          if (input) input.checked = true;

          const candId = card.getAttribute('data-candidate-id');
          const selectedCand = candidates.find((c) => c.id === candId);
          this.discrepancyState.selectedCandidate = selectedCand || null;
          this.btnDiscrepancyApply.disabled = !selectedCand;
        });
      });

      const initialSelected = candidates.find((c) => disc.resolution === c.id);
      if (initialSelected) {
        this.discrepancyState.selectedCandidate = initialSelected;
      }
      this.btnDiscrepancyApply.disabled = !this.discrepancyState.selectedCandidate;
      return;
    }

    let candidateList = [];
    const searchQuery = this.discrepancyState.searchQuery;

    if (searchQuery) {
      // Free search across full in-memory catalog
      const catalog = this.macroResult.catalog || [];
      candidateList = catalog
        .filter((item) => {
          const tCode = item.turmaCode.toLowerCase();
          const tOrig = (item.turmaOriginal || '').toLowerCase();
          const u = item.unidade.toLowerCase();
          const c = item.curso.toLowerCase();
          const cat = item.category.toLowerCase();
          return (
            tCode.includes(searchQuery) ||
            tOrig.includes(searchQuery) ||
            u.includes(searchQuery) ||
            c.includes(searchQuery) ||
            cat.includes(searchQuery)
          );
        })
        .map((item) => ({
          ...item,
          matchLevel: 'search',
          levelLabel: 'Resultados de pesquisa'
        }));
    } else {
      // Deterministic candidates for this class (Levels 1, 2, 3)
      candidateList = disc.candidates || [];
    }

    this.discrepancyCandidatesCountBadge.textContent = `${candidateList.length} registro(s) para conferência`;

    if (candidateList.length === 0) {
      this.discrepancyCandidatesList.innerHTML = `
        <div style="padding: 1.5rem; text-align: center; color: var(--text-dim); background: var(--surface-1); border: 1px dashed var(--border-subtle); border-radius: var(--radius-sm); font-size: 0.85rem;">
          ${
            searchQuery
              ? `Nenhum registro encontrado nas bases carregadas para a busca "${searchQuery}".`
              : 'Nenhum candidato preliminar identificado nos níveis 1, 2 ou 3. Utilize o campo de pesquisa acima para consultar qualquer turma carregada.'
          }
        </div>
      `;
      this.btnDiscrepancyApply.disabled = true;
      return;
    }

    // Check conflict (double usage) for each candidate against other active rows
    const rows = this.macroResult.rows || [];
    const activeGroupKey = this.discrepancyState.activeGroupKey;

    this.discrepancyCandidatesList.innerHTML = candidateList
      .map((cand) => {
        const candidateKey = `${cand.category}___${cand.normUnidade}___${cand.normCurso}___${cand.turmaCode}`;

        // Check if another class group is using this matriculados candidate
        const conflictRow = rows.find((r) => {
          if (r._groupKey === activeGroupKey) return false;
          if (r._isManualAssociation && r._manualOverride) {
            return (
              r._manualOverride.candidateKey === candidateKey ||
              (r._manualOverride.targetCategory === cand.category &&
                r._manualOverride.targetTurmaCode === cand.turmaCode &&
                r['Unidade operacional (Escola)'] === cand.unidade)
            );
          }
          if (r['Alunos'] > 0) {
            const rU = ColumnMatcher.normalizeString(r['Unidade operacional (Escola)']).replace(/^(?:senai|cfp|escola|unidade|centro|cetind)+/g, '');
            const rC = ColumnMatcher.normalizeString(r['Curso']).replace(/^(?:tecnicoem|tecnicode|cursobtecnico|curso)+/g, '');
            const rT = String(r['Turma']).trim();
            return r['Categoria'] === cand.category && rU === cand.normUnidade && rC === cand.normCurso && rT === cand.turmaCode;
          }
          return false;
        });

        const isConflict = !!conflictRow;
        const isSelected = this.discrepancyState.selectedCandidate && this.discrepancyState.selectedCandidate.id === cand.id;

        const tierClass =
          cand.matchLevel === 1 ? 'tier-1' : cand.matchLevel === 2 ? 'tier-2' : cand.matchLevel === 3 ? 'tier-3' : 'tier-search';

        return `
          <label class="candidate-card ${isSelected ? 'selected' : ''} ${isConflict ? 'has-conflict' : ''}" data-candidate-id="${cand.id}">
            <input type="radio" name="discrepancyCandidateRadio" value="${cand.id}" ${isSelected ? 'checked' : ''} ${isConflict ? 'disabled' : ''}>
            <div class="candidate-info">
              <div class="candidate-top-row">
                <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                  <span class="candidate-code">${cand.turmaCode}</span>
                  <span class="status-pill ${cand.category === 'CHP' ? 'info' : 'warning'}" style="font-size: 0.7rem; font-weight: 700;">
                    ${cand.category}
                  </span>
                  <span class="candidate-tier-badge ${tierClass}">${cand.levelLabel}</span>
                </div>
                <div style="font-weight: 700; color: var(--text-main); font-size: 0.85rem;">
                  ${cand.alunos} aluno${cand.alunos > 1 ? 's' : ''} matriculado${cand.alunos > 1 ? 's' : ''}
                </div>
              </div>
              <div class="candidate-meta-row">
                <strong>${cand.unidade}</strong> &bull; ${cand.curso}
                ${cand.turmaOriginal && cand.turmaOriginal !== cand.turmaCode ? ` <span style="color: var(--text-dim); font-size: 0.725rem;">(CODTURMA original: ${cand.turmaOriginal})</span>` : ''}
              </div>
              ${
                isConflict
                  ? `<div style="font-size: 0.725rem; color: var(--accent-danger); font-weight: 600; margin-top: 0.2rem;">
                       ⚠ Já associado a outra turma (${conflictRow['Unidade operacional (Escola)']} • ${conflictRow['Curso']} • ${conflictRow['Turma']}). Desfaça a associação anterior antes de reutilizar.
                     </div>`
                  : ''
              }
            </div>
          </label>
        `;
      })
      .join('');

    // Attach click handlers to candidate cards
    this.discrepancyCandidatesList.querySelectorAll('.candidate-card').forEach((card) => {
      card.addEventListener('click', () => {
        if (card.classList.contains('has-conflict')) {
          if (this.discrepancyConflictBanner) {
            this.discrepancyConflictBanner.style.display = 'flex';
            this.discrepancyConflictText.textContent =
              'Este registro de matriculados já está associado a outra turma. Desfaça a associação existente antes de reutilizá-lo para evitar duplicidade de contagem.';
          }
          this.btnDiscrepancyApply.disabled = true;
          return;
        }

        if (this.discrepancyConflictBanner) {
          this.discrepancyConflictBanner.style.display = 'none';
        }

        this.discrepancyCandidatesList.querySelectorAll('.candidate-card').forEach((c) => c.classList.remove('selected'));
        card.classList.add('selected');

        const input = card.querySelector('input[type="radio"]');
        if (input) input.checked = true;

        const candId = card.getAttribute('data-candidate-id');
        const selectedCand = candidateList.find((c) => c.id === candId);
        this.discrepancyState.selectedCandidate = selectedCand || null;

        this.btnDiscrepancyApply.disabled = !selectedCand;
      });
    });

    this.btnDiscrepancyApply.disabled = !this.discrepancyState.selectedCandidate;
  }

  /**
   * Opens confirmation modal before applying manual association (Section 12)
   */
  openConfirmManualAssociationModal() {
    const cand = this.discrepancyState.selectedCandidate;
    const disc = this.discrepancyState.activeDiscrepancy;

    if (!cand || !disc) {
      this.showToast('Por favor, selecione uma opção para continuar.', 'warning', 'Seleção Pendente');
      return;
    }

    if (disc.type === 'salvador_ited_ambiguity') {
      const src = disc.source;
      this.modalConfirmAssocBody.innerHTML = `
        <div style="background: var(--surface-2); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 1rem; margin-bottom: 1rem; font-size: 0.85rem; line-height: 1.5;">
          <div style="margin-bottom: 0.75rem;">
            <strong style="color: var(--text-muted); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.04em;">Origem dos Alunos (Estudantes):</strong>
            <div style="color: var(--text-main); font-weight: 600; margin-top: 0.15rem;">
              SENAI - ITED &bull; Salvador &bull; ${src.curso}
            </div>
            <div style="color: var(--text-dim); font-size: 0.8rem; margin-top: 0.1rem;">
              ${src.estudantesCount} estudante(s)
            </div>
          </div>

          <div style="border-top: 1px dashed var(--border-subtle); padding-top: 0.75rem;">
            <strong style="color: var(--text-muted); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.04em;">Unidade Operacional Selecionada:</strong>
            <div style="color: var(--brand-secondary); font-weight: 700; font-size: 1rem; margin-top: 0.15rem;">
              ${cand.unidade}
            </div>
          </div>
        </div>

        <div class="alert-banner info" style="margin-bottom: 0; padding: 0.75rem 1rem;">
          <div class="alert-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="16" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
          </div>
          <div class="alert-content" style="font-size: 0.8125rem;">
            Os alunos deste curso serão consolidados na unidade <strong>${cand.unidade}</strong>. Os totais serão recalculados em memória.
          </div>
        </div>
      `;
      this.modalConfirmManualAssociation.classList.add('active');
      this.modalConfirmManualAssociation.setAttribute('aria-hidden', 'false');
      return;
    }

    const src = disc.source;

    this.modalConfirmAssocBody.innerHTML = `
      <div style="background: var(--surface-2); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 1rem; margin-bottom: 1rem; font-size: 0.85rem; line-height: 1.5;">
        <div style="margin-bottom: 0.75rem;">
          <strong style="color: var(--text-muted); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.04em;">Origem dos Aptos:</strong>
          <div style="color: var(--text-main); font-weight: 600; margin-top: 0.15rem;">
            ${src.unidade} &bull; ${src.curso}
          </div>
          <div style="color: var(--text-dim); font-size: 0.8rem; margin-top: 0.1rem;">
            Turma: <code style="font-family: var(--font-mono); font-weight: 700;">${src.turmaNormalizada}</code> &bull; ${src.aptosCount} estudante(s) apto(s)
          </div>
        </div>

        <div style="border-top: 1px dashed var(--border-subtle); padding-top: 0.75rem;">
          <strong style="color: var(--text-muted); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.04em;">Turma de Matriculados Selecionada:</strong>
          <div style="color: var(--text-main); font-weight: 600; margin-top: 0.15rem;">
            ${cand.unidade} &bull; ${cand.curso}
          </div>
          <div style="color: var(--brand-secondary); font-size: 0.8rem; margin-top: 0.1rem;">
            Turma: <code style="font-family: var(--font-mono); font-weight: 700;">${cand.turmaCode}</code> &bull; Categoria: <strong>${cand.category}</strong> &bull; <strong>${cand.alunos} alunos matriculados</strong>
          </div>
        </div>
      </div>

      <div class="alert-banner warning" style="margin-bottom: 0; padding: 0.75rem 1rem;">
        <div class="alert-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
        </div>
        <div class="alert-content" style="font-size: 0.8125rem;">
          Esta associação <strong>não foi realizada automaticamente</strong>. Os totais de alunos, inaptos e percentuais da turma serão recalculados com base nestes dados.
        </div>
      </div>
    `;

    this.modalConfirmManualAssociation.classList.add('active');
    this.modalConfirmManualAssociation.setAttribute('aria-hidden', 'false');
  }

  /**
   * Closes confirmation modal
   */
  closeConfirmManualAssociationModal() {
    if (this.modalConfirmManualAssociation) {
      this.modalConfirmManualAssociation.classList.remove('active');
      this.modalConfirmManualAssociation.setAttribute('aria-hidden', 'true');
    }
  }

  /**
   * Confirms and applies the manual association, recalculates result and updates UI
   */
  confirmAndApplyManualAssociation() {
    const cand = this.discrepancyState.selectedCandidate;
    const groupKey = this.discrepancyState.activeGroupKey;
    const disc = this.discrepancyState.activeDiscrepancy;

    if (!cand || !groupKey) return;

    if (disc && disc.type === 'salvador_ited_ambiguity') {
      if (!this.loadedFiles.estudantes) return;
      if (!this.loadedFiles.estudantes.manualItedOverrides) {
        this.loadedFiles.estudantes.manualItedOverrides = {};
      }
      this.loadedFiles.estudantes.manualItedOverrides[groupKey] = cand.unidade;

      this.closeConfirmManualAssociationModal();
      this.closeDiscrepancyModal();

      this.recalculateMacroResult();
      this.showToast(`Unidade "${cand.unidade}" confirmada para Salvador / ITED. Macrodado recalculado.`, 'success', 'Decisão Confirmada');
      return;
    }

    if (!this.loadedFiles.aptos) return;
    if (!this.loadedFiles.aptos.manualClassOverrides) {
      this.loadedFiles.aptos.manualClassOverrides = {};
    }

    const candidateKey = `${cand.category}___${cand.normUnidade}___${cand.normCurso}___${cand.turmaCode}`;

    // Store manual decision in memory without mutating raw records
    this.loadedFiles.aptos.manualClassOverrides[groupKey] = {
      targetCategory: cand.category,
      targetUnidade: cand.unidade,
      targetCurso: cand.curso,
      targetTurmaCode: cand.turmaCode,
      targetTurmaOriginal: cand.turmaOriginal,
      matriculadosCount: cand.alunos,
      candidateKey: candidateKey,
      method: 'manual',
      timestamp: new Date().toISOString()
    };

    this.closeConfirmManualAssociationModal();
    this.closeDiscrepancyModal();

    this.recalculateMacroResult();
    this.showToast(`Associação manual aplicada para a turma "${cand.turmaCode}". Macrodado recalculado.`, 'success', 'Associação Confirmada');
  }

  /**
   * Undoes the active discrepancy override
   */
  undoActiveDiscrepancy() {
    const groupKey = this.discrepancyState.activeGroupKey;
    if (!groupKey) return;
    this.undoManualAssociation(groupKey);
    this.closeDiscrepancyModal();
  }

  /**
   * Undoes a manual association for a given class group or ITED Salvador ambiguity
   * @param {string} groupKey 
   */
  undoManualAssociation(groupKey) {
    if (this.selectedModelId === 'prova-pratica') {
      if (this.loadedFiles.estudantes && this.loadedFiles.estudantes.manualItedOverrides && this.loadedFiles.estudantes.manualItedOverrides[groupKey]) {
        delete this.loadedFiles.estudantes.manualItedOverrides[groupKey];
        this.recalculateMacroResult();
        this.showToast('Decisão manual desfeita. Ambiguidade de Salvador restaurada.', 'info', 'Decisão Removida');
      }
      return;
    }

    if (this.loadedFiles.aptos && this.loadedFiles.aptos.manualClassOverrides && this.loadedFiles.aptos.manualClassOverrides[groupKey]) {
      delete this.loadedFiles.aptos.manualClassOverrides[groupKey];
      this.recalculateMacroResult();
      this.showToast('Associação manual desfeita. Valores retornaram ao estado original.', 'info', 'Associação Removida');
    }
  }

  /**
   * Export to XLSX matching official modelo final po.xlsx or modelo final pp.xlsx template
   */
  async exportXLSX() {
    if (!this.macroResult) return;
    try {
      this.showToast('Gerando arquivo Excel no modelo oficial...', 'info', 'Exportando');
      const baseName = this.selectedModelId === 'prova-pratica' ? 'SAEP - Prova Prática' : 'SAEP - Prova Objetiva';
      await ExporterService.exportToXLSX(this.macroResult.columns, this.macroResult.rows, baseName, this.selectedModelId);
      this.showToast('Download do arquivo XLSX concluído com sucesso!', 'success', 'Exportação Concluída');
    } catch (err) {
      console.error('Erro na exportação XLSX:', err);
      this.showToast(`Erro ao exportar XLSX: ${err.message}`, 'danger', 'Erro na Exportação');
    }
  }

  /**
   * Export to CSV
   */
  exportCSV() {
    if (!this.macroResult) return;
    try {
      const baseName = this.selectedModelId === 'prova-pratica' ? 'SAEP_Prova_Pratica' : 'SAEP_Prova_Objetiva';
      ExporterService.exportCSV(this.macroResult.columns, this.macroResult.rows, ';', baseName);
      this.showToast('Download do arquivo CSV concluído com sucesso!', 'success', 'Exportação Concluída');
    } catch (err) {
      this.showToast(`Erro ao exportar CSV: ${err.message}`, 'danger', 'Erro na Exportação');
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
      participacao: null,
      estudantes: null
    };
    this.macroResult = null;
    this.filterQuery = '';
    this.pickerState = { roleKey: null, fieldKey: null, selectedColumn: null };
    this.discrepancyState = { activeGroupKey: null, activeDiscrepancy: null, selectedCandidate: null, searchQuery: '' };
    this.tableSearchInput.value = '';
    this.activeFilterTab = 'all';
    if (this.filterTabAll) this.filterTabAll.classList.add('active');
    if (this.filterTabWarnings) this.filterTabWarnings.classList.remove('active');
    this.renderFileCards();
    this.updateStep2NextButton();
    this.goToStep(1);
  }
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});

