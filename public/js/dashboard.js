document.addEventListener('DOMContentLoaded', () => {
  // Global State
  let currentUser = null;
  let suppliersList = [];
  let transactionsList = [];
  let currentViewMode = 'cards'; // 'cards' or 'table'

  // DOM Elements
  const suppliersCardsContainer = document.getElementById('suppliers-cards-container');
  const suppliersTableContainer = document.getElementById('suppliers-table-container');
  const suppliersTableBody = document.getElementById('suppliers-table-body');
  const comparisonTableBody = document.getElementById('comparison-table-body');
  const transactionsTableBody = document.getElementById('transactions-table-body');
  const communityBenchmarksBody = document.getElementById('community-benchmarks-body');

  // Modals
  const supplierModal = document.getElementById('supplier-modal');
  const txModal = document.getElementById('tx-modal');
  const disputeEvidenceModal = document.getElementById('dispute-evidence-modal');
  const communitySupplierModal = document.getElementById('community-supplier-modal');
const supplierTimelineModal = document.getElementById('supplier-timeline-modal');
  const settingsModal = document.getElementById('settings-modal');

  // Forms
  const supplierForm = document.getElementById('supplier-form');
  const txForm = document.getElementById('tx-form');
  const txSupplierSelect = document.getElementById('tx-supplier-select');
  const txSupplierFilter = document.getElementById('tx-supplier-filter');

  // Dispute toggle in Tx form
  const txHasDispute = document.getElementById('tx-has-dispute');
  const disputeFields = document.getElementById('dispute-fields');

  txHasDispute.addEventListener('change', () => {
    disputeFields.style.display = txHasDispute.checked ? 'block' : 'none';
  });

  // Delegated click handler for supplier cards/table — attached ONCE here,
  // so re-rendering suppliers (cards or table) never re-binds or
  // double-binds listeners on the same buttons.
  document.addEventListener('click', (e) => {
    const quickTxBtn = e.target.closest('.btn-quick-tx');
    if (quickTxBtn) {
      openTransactionModal(quickTxBtn.getAttribute('data-id'));
      return;
    }
    
    const communityBtn = e.target.closest('.btn-community-view');
    if (communityBtn) {
      openCommunitySupplierModal(communityBtn.getAttribute('data-id'));
      return;
    }
    const timelineBtn = e.target.closest('.btn-timeline-view');
if (timelineBtn) {
   openSupplierTimelineModal(timelineBtn.getAttribute('data-id'));
  return;
}
    const editBtn = e.target.closest('.btn-edit-supplier');
    if (editBtn) {
      editSupplier(editBtn.getAttribute('data-id'));
      return;
    }
    const deleteBtn = e.target.closest('.btn-delete-supplier');
    if (deleteBtn) {
      deleteSupplier(deleteBtn.getAttribute('data-id'));
      return;
    }
  });

  // View Mode Switchers
  const btnViewCards = document.getElementById('view-mode-cards');
  const btnViewTable = document.getElementById('view-mode-table');

  btnViewCards.addEventListener('click', () => {
    currentViewMode = 'cards';
    suppliersCardsContainer.style.display = 'grid';
    suppliersTableContainer.style.display = 'none';
    btnViewCards.classList.add('btn-primary');
    btnViewCards.classList.remove('btn-secondary');
    btnViewTable.classList.remove('btn-primary');
    btnViewTable.classList.add('btn-secondary');
  });

  btnViewTable.addEventListener('click', () => {
    currentViewMode = 'table';
    suppliersCardsContainer.style.display = 'none';
    suppliersTableContainer.style.display = 'block';
    btnViewTable.classList.add('btn-primary');
    btnViewTable.classList.remove('btn-secondary');
    btnViewCards.classList.remove('btn-primary');
    btnViewCards.classList.add('btn-secondary');
  });

  // Sidebar Tab Switching
  document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.sidebar-nav .nav-item').forEach(i => i.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));

      item.classList.add('active');
      const targetTabId = item.getAttribute('data-tab');
      const targetTab = document.getElementById(targetTabId);
      if (targetTab) targetTab.classList.add('active');

      const viewTitle = document.getElementById('view-title');
      const viewSubtitle = document.getElementById('view-subtitle');

      if (targetTabId === 'tab-suppliers') {
        viewTitle.textContent = 'Suppliers & Reliability Scorecards';
        viewSubtitle.textContent = 'Private multi-dimensional track records & dispute audit trail';
        fetchSuppliers();
      } else if (targetTabId === 'tab-comparison') {
        viewTitle.textContent = 'Supplier Benchmark & Comparison';
        viewSubtitle.textContent = 'Side-by-side performance ranking to benchmark new supplier offers';
        fetchComparisonMatrix();
      } else if (targetTabId === 'tab-transactions') {
        viewTitle.textContent = 'Transaction Ledger & Dispute Claims';
        viewSubtitle.textContent = 'Objective evidence audit trail with WhatsApp notice formatting';
        fetchTransactions();
      } else if (targetTabId === 'tab-community') {
        viewTitle.textContent = 'B2B Community Intelligence Pool';
        viewSubtitle.textContent = 'Blinded aggregate reliability benchmarks across Pakistan wholesale markets';
        fetchCommunityData();
      }
    });
  });

  // Check Auth & Init
  checkAuthAndInit();

  async function checkAuthAndInit() {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (!data.success) {
        window.location.href = '/login.html';
        return;
      }

      currentUser = data.user;
      document.getElementById('user-store-name').textContent = currentUser.business_name || currentUser.username;
      document.getElementById('user-location-tag').textContent = `${currentUser.market_area || 'Market'}, ${currentUser.city || 'Pakistan'}`;
      document.getElementById('avatar-initials').textContent = (currentUser.business_name || currentUser.username).charAt(0).toUpperCase();

      // Set default dates
      const today = new Date().toISOString().split('T')[0];
      document.getElementById('tx-date-promised').value = today;
      document.getElementById('tx-date-actual').value = today;

      refreshAll();
    } catch (err) {
      window.location.href = '/login.html';
    }
  }

  async function refreshAll() {
    await Promise.all([
      fetchStats(),
      fetchSuppliers(),
      fetchComparisonMatrix(),
      fetchTransactions(),
      fetchCommunityData()
    ]);
  }

  document.getElementById('btn-refresh').addEventListener('click', refreshAll);
  document.getElementById('btn-settings').addEventListener('click', () => {
  document.getElementById('settings-community-toggle').checked = !!(currentUser && currentUser.community_opt_in);
  settingsModal.classList.add('active');
});

document.getElementById('btn-save-settings').addEventListener('click', async () => {
  const enabled = document.getElementById('settings-community-toggle').checked;
  const btn = document.getElementById('btn-save-settings');
  btn.disabled = true;
  try {
    const res = await fetch('/api/auth/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ community_opt_in: enabled })
    });
    const result = await res.json();
    if (result.success) {
      currentUser = result.user;
      settingsModal.classList.remove('active');
      refreshAll();
    } else {
      alert(result.message || 'Failed to save settings');
    }
  } catch (err) {
    alert('Failed to save settings');
  } finally {
    btn.disabled = false;
  }
});

  // 1. Fetch Stats
  async function fetchStats() {
    try {
      const res = await fetch('/api/transactions/summary/stats');
      const result = await res.json();
      if (result.success) {
        const stats = result.data;
        document.getElementById('stat-avg-reliability').textContent = stats.averageReliability + '%';
        document.getElementById('stat-overall-grade').textContent = 'Grade ' + stats.overallGrade;
        document.getElementById('stat-total-suppliers').textContent = stats.totalSuppliers;
        document.getElementById('stat-total-tx').textContent = stats.totalTransactions;
        document.getElementById('stat-open-disputes').textContent = stats.openDisputes;
        document.getElementById('stat-at-risk').textContent = stats.atRiskSuppliers;
      }
    } catch (err) {
      console.error('Stats error:', err);
    }
  }

  // 2. Fetch Suppliers & Render Scorecards
  async function fetchSuppliers() {
    try {
      const search = document.getElementById('supplier-search').value;
      const category = document.getElementById('supplier-category-filter').value;
      const risk = document.getElementById('supplier-risk-filter').value;

      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (category) params.append('category', category);
      if (risk) params.append('risk', risk);

      const res = await fetch(`/api/suppliers?${params.toString()}`);
      const result = await res.json();

      if (result.success) {
        suppliersList = result.data;
        renderSuppliersCards(suppliersList);
        renderSuppliersTable(suppliersList);
        populateSupplierDropdowns(suppliersList);
      }
    } catch (err) {
      console.error('Fetch suppliers error:', err);
    }
  }

  function renderSuppliersCards(suppliers) {
    if (suppliers.length === 0) {
      suppliersCardsContainer.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 48px 20px; background: var(--bg-card); border-radius: var(--radius-md);">
          <i class="fa-solid fa-truck" style="font-size: 2rem; margin-bottom: 12px; color: var(--text-secondary);"></i>
          <h3>No suppliers found in this filter</h3>
          <p style="font-size: 0.85rem; margin-top: 4px;">Click "Add Supplier" or "Log Delivery" to begin tracking reliability.</p>
        </div>
      `;
      return;
    }

    suppliersCardsContainer.innerHTML = suppliers.map(s => {
      const sc = s.scorecard;
      const gradeClass = `grade-${sc.grade.replace('+', 'plus')}`;
      const riskBadgeClass = sc.risk_status === 'Deteriorating' ? 'badge-risk-deteriorating' : (sc.risk_status === 'Improving' ? 'badge-risk-improving' : 'badge-risk-stable');

      return `
        <div class="supplier-box">
          <div>
            <div class="supplier-box-top">
              <div>
                <div style="display: flex; align-items: center; gap: 8px;">
                  <h4 style="font-size: 1.05rem; font-weight: 700;">${escapeHtml(s.name)}</h4>
                </div>
                <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 2px;">
                  <i class="fa-solid fa-location-dot"></i> ${escapeHtml(s.market_area || s.city || 'Wholesale Market')}, ${escapeHtml(s.city || '')}
                </div>
                <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 2px;">
                  <i class="fa-solid fa-phone"></i> ${escapeHtml(s.phone)} · <span class="badge badge-category" style="padding: 2px 6px; font-size: 0.7rem;">${escapeHtml(s.category)}</span>
                </div>
              </div>
              <div style="text-align: center;">
                <div class="grade-badge ${gradeClass}">${sc.grade}</div>
                <div style="font-size: 0.75rem; font-weight: 700; margin-top: 4px;">${sc.composite_score}%</div>
              </div>
            </div>

            <!-- Risk Alert if deteriorating -->
            ${sc.risk_status === 'Deteriorating' ? `
              <div style="background: rgba(244, 63, 94, 0.12); border: 1px solid rgba(244, 63, 94, 0.3); border-radius: var(--radius-sm); padding: 8px 10px; font-size: 0.75rem; color: #fb7185; margin-bottom: 12px;">
                ${escapeHtml(sc.risk_message)}
              </div>
            ` : ''}

            <!-- 4-Dimension Reliability Breakdown -->
            <div class="score-dimension-list">
              <div class="dim-row">
                <span style="color: var(--text-secondary);"><i class="fa-solid fa-clock" style="color: var(--accent-cyan); width: 14px;"></i> Punctuality:</span>
                <div class="dim-bar-wrap">
                  <div class="dim-bar-fill fill-punctuality" style="width: ${sc.punctuality_score}%;"></div>
                </div>
                <span style="font-weight: 700; width: 44px; text-align: right;">${sc.on_time_rate}%</span>
              </div>

              <div class="dim-row">
                <span style="color: var(--text-secondary);"><i class="fa-solid fa-box-open" style="color: var(--accent-emerald); width: 14px;"></i> Qty Accuracy:</span>
                <div class="dim-bar-wrap">
                  <div class="dim-bar-fill fill-accuracy" style="width: ${sc.quantity_score}%;"></div>
                </div>
                <span style="font-weight: 700; width: 44px; text-align: right;">${sc.accuracy_rate}%</span>
              </div>

              <div class="dim-row">
                <span style="color: var(--text-secondary);"><i class="fa-solid fa-star" style="color: var(--accent-amber); width: 14px;"></i> Quality Rating:</span>
                <div class="dim-bar-wrap">
                  <div class="dim-bar-fill fill-quality" style="width: ${sc.quality_score}%;"></div>
                </div>
                <span style="font-weight: 700; width: 44px; text-align: right;">${sc.avg_quality_stars}★</span>
              </div>

              <div class="dim-row">
                <span style="color: var(--text-secondary);"><i class="fa-solid fa-handshake-slash" style="color: var(--accent-purple); width: 14px;"></i> Disputes Rate:</span>
                <div class="dim-bar-wrap">
                  <div class="dim-bar-fill fill-dispute" style="width: ${sc.dispute_score}%;"></div>
                </div>
                <span style="font-weight: 700; width: 44px; text-align: right; color: ${sc.dispute_rate > 20 ? 'var(--accent-rose)' : 'inherit'};">${sc.dispute_rate}%</span>
              </div>
            </div>
          </div>

          <div style="margin-top: 16px; padding-top: 12px; border-top: 1px solid var(--border-subtle); display: flex; align-items: center; justify-content: space-between;">
            <div style="font-size: 0.75rem; color: var(--text-muted);">
              <span>${sc.total_transactions} orders logged</span> · <span class="badge ${riskBadgeClass}" style="font-size: 0.68rem;">${sc.risk_status}</span>
            </div>
            <div style="display: flex; gap: 6px;">
  <button class="btn-icon btn-timeline-view" data-id="${s.id}" title="Dispute Timeline">
    <i class="fa-solid fa-clock-rotate-left"></i>
  </button>
  <button class="btn btn-secondary btn-sm btn-community-view" data-id="${s.id}" title="View Blinded Community Network Score">
    <i class="fa-solid fa-network-wired" style="color: #818cf8;"></i>
  </button>
  <button class="btn btn-emerald btn-sm btn-quick-tx" data-id="${s.id}" title="Log Delivery for this supplier">
    <i class="fa-solid fa-plus"></i> Log
  </button>
              <button class="btn-icon btn-edit-supplier" data-id="${s.id}" title="Edit Supplier">
                <i class="fa-solid fa-pen-to-square"></i>
              </button>
              <button class="btn-icon btn-delete-supplier" data-id="${s.id}" style="color: var(--accent-rose);" title="Delete Supplier">
                <i class="fa-solid fa-trash"></i>
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  function renderSuppliersTable(suppliers) {
    if (suppliers.length === 0) {
      suppliersTableBody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: var(--text-muted); padding: 30px;">No suppliers found.</td></tr>`;
      return;
    }

    suppliersTableBody.innerHTML = suppliers.map(s => {
      const sc = s.scorecard;
      const gradeClass = `grade-${sc.grade.replace('+', 'plus')}`;
      const riskBadgeClass = sc.risk_status === 'Deteriorating' ? 'badge-risk-deteriorating' : (sc.risk_status === 'Improving' ? 'badge-risk-improving' : 'badge-risk-stable');

      return `
        <tr>
          <td>
            <div style="font-weight: 700;">${escapeHtml(s.name)}</div>
            <div style="font-size: 0.74rem; color: var(--text-muted);">${escapeHtml(s.market_area || s.city || '')} · ${escapeHtml(s.phone)}</div>
          </td>
          <td>
            <div><span class="badge badge-category">${escapeHtml(s.category)}</span></div>
            <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 2px;">${escapeHtml(s.payment_terms || 'COD')}</div>
          </td>
          <td>
            <div style="display: flex; align-items: center; gap: 6px;">
              <span class="grade-badge ${gradeClass}" style="width: 28px; height: 28px; font-size: 0.85rem;">${sc.grade}</span>
              <span style="font-weight: 700;">${sc.composite_score}%</span>
            </div>
          </td>
          <td><span style="font-weight: 600; color: var(--accent-cyan);">${sc.on_time_rate}%</span></td>
          <td><span style="font-weight: 600; color: var(--accent-emerald);">${sc.accuracy_rate}%</span></td>
          <td><span style="font-weight: 600; color: var(--accent-amber);">${sc.avg_quality_stars}★</span></td>
          <td><span style="font-weight: 600; color: ${sc.dispute_count > 0 ? 'var(--accent-rose)' : 'inherit'};">${sc.dispute_count} (${sc.dispute_rate}%)</span></td>
          <td><span class="badge ${riskBadgeClass}">${sc.risk_status}</span></td>
          <td>
            <div class="actions-cell">
  <button class="btn-icon btn-timeline-view" data-id="${s.id}" title="Dispute Timeline">
    <i class="fa-solid fa-clock-rotate-left"></i>
  </button>
  <button class="btn btn-secondary btn-sm btn-community-view" data-id="${s.id}" title="Community Benchmark">
    <i class="fa-solid fa-users" style="color: #818cf8;"></i>
  </button>
  <button class="btn-icon btn-edit-supplier" data-id="${s.id}"><i class="fa-solid fa-pen"></i></button>
  <button class="btn-icon btn-delete-supplier" data-id="${s.id}" style="color: var(--accent-rose);"><i class="fa-solid fa-trash"></i></button>
</div>
          </td>
        </tr>
      `;
    }).join('');
  }

  function populateSupplierDropdowns(suppliers) {
    const options = suppliers.map(s => `<option value="${s.id}">${escapeHtml(s.name)} (${escapeHtml(s.market_area || s.city || 'Wholesale')})</option>`).join('');
    
    txSupplierSelect.innerHTML = `<option value="">Select a supplier from your registry</option>` + options;
    
    const curVal = txSupplierFilter.value;
    txSupplierFilter.innerHTML = `<option value="">All Suppliers</option>` + options;
    if (curVal) txSupplierFilter.value = curVal;
  }

  // 3. Fetch Comparison Matrix
  async function fetchComparisonMatrix() {
    try {
      const category = document.getElementById('compare-category-filter').value;
      const params = new URLSearchParams();
      if (category) params.append('category', category);

      const res = await fetch(`/api/suppliers/compare/matrix?${params.toString()}`);
      const result = await res.json();

      if (result.success) {
        renderComparisonTable(result.data);
      }
    } catch (err) {
      console.error('Matrix error:', err);
    }
  }

  function renderComparisonTable(matrix) {
    if (matrix.length === 0) {
      comparisonTableBody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: var(--text-muted); padding: 40px;">No suppliers available in this category.</td></tr>`;
      return;
    }

    comparisonTableBody.innerHTML = matrix.map((s, idx) => {
      const gradeClass = `grade-${s.grade.replace('+', 'plus')}`;
      const rankBadge = idx === 0 ? '🥇 #1' : (idx === 1 ? '🥈 #2' : (idx === 2 ? '🥉 #3' : `#${idx + 1}`));
      const riskClass = s.risk_status === 'Deteriorating' ? 'badge-risk-deteriorating' : (s.risk_status === 'Improving' ? 'badge-risk-improving' : 'badge-risk-stable');

      return `
        <tr>
          <td>
            <div style="font-weight: 700; display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 0.8rem; font-weight: 800; color: #818cf8;">${rankBadge}</span>
              <span>${escapeHtml(s.name)}</span>
            </div>
            <div style="font-size: 0.72rem; color: var(--text-muted);">${escapeHtml(s.phone)} · ${escapeHtml(s.category)}</div>
          </td>
          <td>${escapeHtml(s.market_area || 'Market')}, ${escapeHtml(s.city)}</td>
          <td><span style="font-size: 0.8rem; color: var(--text-secondary);">${escapeHtml(s.payment_terms || 'COD')}</span></td>
          <td>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="grade-badge ${gradeClass}" style="width: 32px; height: 32px; font-size: 0.95rem;">${s.grade}</span>
              <div>
                <div style="font-weight: 800; font-size: 1rem;">${s.composite_score}%</div>
                <div style="font-size: 0.7rem; color: var(--text-muted);">${s.total_transactions} orders</div>
              </div>
            </div>
          </td>
          <td>
            <div style="font-weight: 700; color: var(--accent-cyan);">${s.on_time_rate}%</div>
            <div style="font-size: 0.7rem; color: var(--text-muted);">${s.avg_delay_days > 0 ? `Avg delay: ${s.avg_delay_days}d` : 'No delays'}</div>
          </td>
          <td>
            <div style="font-weight: 700; color: var(--accent-emerald);">${s.accuracy_rate}%</div>
            <div style="font-size: 0.7rem; color: var(--text-muted);">Fill accuracy</div>
          </td>
          <td>
            <div style="font-weight: 700; color: var(--accent-amber);">${s.avg_quality_stars} ★</div>
            <div style="font-size: 0.7rem; color: var(--text-muted);">Consistency</div>
          </td>
          <td>
            <div style="font-weight: 700; color: ${s.dispute_count > 0 ? 'var(--accent-rose)' : 'inherit'};">${s.dispute_rate}%</div>
            <div style="font-size: 0.7rem; color: var(--text-muted);">${s.dispute_count} claims</div>
          </td>
          <td>
            <span class="badge ${riskClass}">${s.risk_status}</span>
          </td>
        </tr>
      `;
    }).join('');
  }

  // 4. Fetch Transactions & Disputes
  async function fetchTransactions() {
    try {
      const supplierId = txSupplierFilter.value;
      const hasDispute = document.getElementById('tx-dispute-filter').value;
      const disputeStatus = document.getElementById('tx-status-filter').value;
      const search = document.getElementById('tx-search-input').value;

      const params = new URLSearchParams();
      if (supplierId) params.append('supplier_id', supplierId);
      if (hasDispute) params.append('has_dispute', hasDispute);
      if (disputeStatus) params.append('dispute_status', disputeStatus);
      if (search) params.append('search', search);

      const res = await fetch(`/api/transactions?${params.toString()}`);
      const result = await res.json();

      if (result.success) {
        transactionsList = result.data;
        renderTransactionsTable(transactionsList);
      }
    } catch (err) {
      console.error('Fetch transactions error:', err);
    }
  }

  function renderTransactionsTable(transactions) {
    if (transactions.length === 0) {
      transactionsTableBody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: var(--text-muted); padding: 40px;">No transaction records found matching filter.</td></tr>`;
      return;
    }

    transactionsTableBody.innerHTML = transactions.map(t => {
      const isLate = new Date(t.actual_date) > new Date(t.promised_date);
      const punctualityTag = isLate 
        ? `<span class="badge badge-inactive"><i class="fa-solid fa-triangle-exclamation"></i> Delayed</span>`
        : `<span class="badge badge-active"><i class="fa-solid fa-check"></i> On-Time</span>`;

      const disputeTag = t.has_dispute === 1
        ? (t.dispute_status === 'Resolved' 
            ? `<span class="badge badge-dispute-resolved"><i class="fa-solid fa-check-double"></i> Resolved</span>`
            : `<span class="badge badge-dispute-open"><i class="fa-solid fa-circle-exclamation"></i> ${escapeHtml(t.dispute_reason || 'Claim Open')}</span>`)
        : `<span style="color: var(--text-muted); font-size: 0.78rem;">Clean Delivery</span>`;

      return `
        <tr>
          <td>
            <div style="font-weight: 600;">${t.actual_date}</div>
            <div style="font-size: 0.72rem; color: var(--text-muted);">Promised: ${t.promised_date}</div>
          </td>
          <td>
            <div style="font-weight: 700;">${escapeHtml(t.supplier_name)}</div>
            <div style="font-size: 0.72rem; color: var(--text-muted);">${escapeHtml(t.supplier_market || '')}</div>
          </td>
          <td>
            <div style="font-weight: 600;">${escapeHtml(t.item_description)}</div>
            ${t.amount_pkr ? `<div style="font-size: 0.72rem; color: #818cf8; font-family: monospace;">PKR ${Number(t.amount_pkr).toLocaleString()}</div>` : ''}
          </td>
          <td>
            <div style="font-family: monospace; font-size: 0.85rem; font-weight: 700;">
              ${t.quantity_received} / ${t.quantity_ordered}
            </div>
            ${t.quantity_received < t.quantity_ordered ? `<span style="font-size: 0.7rem; color: var(--accent-rose);">Short: -${t.quantity_ordered - t.quantity_received}</span>` : ''}
          </td>
          <td>${punctualityTag}</td>
          <td><span style="color: #fbbf24; font-weight: 600;">${t.quality_rating} ★</span></td>
          <td>${disputeTag}</td>
          <td style="max-width: 200px; font-size: 0.78rem; color: var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
            ${escapeHtml(t.dispute_notes || '—')}
          </td>
          <td>
            <div class="actions-cell">
              ${t.has_dispute === 1 ? `
                <button class="btn btn-emerald btn-sm btn-format-dispute" data-id="${t.id}" title="Generate WhatsApp Dispute Evidence Record">
                  <i class="fa-brands fa-whatsapp"></i> Notice
                </button>
              ` : ''}
              <button class="btn-icon btn-delete-tx" data-id="${t.id}" style="color: var(--accent-rose);" title="Delete Record">
                <i class="fa-solid fa-trash"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    document.querySelectorAll('.btn-format-dispute').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        generateDisputeNotice(id);
      });
    });

    document.querySelectorAll('.btn-delete-tx').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        deleteTransaction(id);
      });
    });
  }

  // 5. Fetch Community Intelligence Data
  async function fetchCommunityData() {
    try {
      const res = await fetch('/api/community/overview');
      const result = await res.json();
      if (result.success) {
        const d = result.data;
        document.getElementById('community-user-contrib').textContent = `${d.userContributionCount} Logged`;
        document.getElementById('community-unlock-status').textContent = d.isUnlocked ? 'Unlocked (Full Network Access)' : `Contribute ${d.unlockThreshold - d.userContributionCount} more to unlock`;

        renderCommunityBenchmarks(d.categoryBenchmarks);
      }
    } catch (err) {
      console.error('Community error:', err);
    }
  }

  function renderCommunityBenchmarks(benchmarks) {
    communityBenchmarksBody.innerHTML = benchmarks.map(b => {
      const gradeClass = `grade-${b.grade.replace('+', 'plus')}`;
      return `
        <tr>
          <td><span style="font-weight: 700;">${escapeHtml(b.category)}</span></td>
          <td><span style="font-family: monospace;">${b.sample_size} deliveries verified</span></td>
          <td><span style="font-weight: 700; color: #818cf8;">${b.average_reliability}%</span></td>
          <td><span style="font-weight: 700; color: var(--accent-cyan);">${b.punctuality_rate}%</span></td>
          <td><span style="font-weight: 700; color: ${b.dispute_rate > 15 ? 'var(--accent-rose)' : 'inherit'};">${b.dispute_rate}%</span></td>
          <td><span class="grade-badge ${gradeClass}" style="width: 28px; height: 28px; font-size: 0.85rem;">${b.grade}</span></td>
        </tr>
      `;
    }).join('');
  }


  function renderCommunityBenchmarks(benchmarks) {
  communityBenchmarksBody.innerHTML = benchmarks.map(b => {
    const gradeClass = `grade-${b.grade.replace('+', 'plus')}`;
    return `
      <tr>
        <td><span style="font-weight: 700;">${escapeHtml(b.category)}</span></td>
        <td><span style="font-family: monospace;">${b.sample_size} deliveries verified</span></td>
        <td><span style="font-weight: 700; color: #818cf8;">${b.average_reliability}%</span></td>
        <td><span style="font-weight: 700; color: var(--accent-cyan);">${b.punctuality_rate}%</span></td>
        <td><span style="font-weight: 700; color: ${b.dispute_rate > 15 ? 'var(--accent-rose)' : 'inherit'};">${b.dispute_rate}%</span></td>
        <td><span class="grade-badge ${gradeClass}" style="width: 28px; height: 28px; font-size: 0.85rem;">${b.grade}</span></td>
      </tr>
    `;
  }).join('');
}

// NEW FUNCTION — paste this here
async function openSupplierTimelineModal(supplierId) {
  supplierTimelineModal.classList.add('active');
  const content = document.getElementById('supplier-timeline-content');
  const nameEl = document.getElementById('timeline-supplier-name');
  content.innerHTML = `<div style="text-align:center; padding:40px; color:var(--text-muted);"><i class="fa-solid fa-spinner fa-spin"></i> Loading dispute history...</div>`;

  try {
    const res = await fetch(`/api/suppliers/${supplierId}`);
    const result = await res.json();
    if (!result.success) {
      content.innerHTML = `<div style="color:var(--accent-rose); padding:20px; text-align:center;">Failed to load supplier timeline.</div>`;
      return;
    }

    const supplier = result.data;
    nameEl.textContent = `${supplier.name} · Evidence record, most recent first`;

    const disputes = (supplier.transactions || []).filter(t => t.has_dispute === 1);

    if (disputes.length === 0) {
      content.innerHTML = `
        <div style="text-align:center; padding:40px; color:var(--text-muted);">
          <i class="fa-solid fa-circle-check" style="font-size:2rem; color:var(--accent-emerald); margin-bottom:10px;"></i>
          <h3>No disputes on record</h3>
          <p style="font-size:0.85rem; margin-top:6px;">Every logged delivery from this supplier has been clean so far.</p>
        </div>`;
      return;
    }

    content.innerHTML = disputes.map(t => `
      <div style="border-left: 3px solid var(--accent-rose); padding: 10px 14px; margin-bottom: 12px; background: var(--bg-card); border-radius: 0 var(--radius-sm) var(--radius-sm) 0;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="font-weight:700;">${t.actual_date}</span>
          <span class="badge ${t.dispute_status === 'Resolved' ? 'badge-dispute-resolved' : 'badge-dispute-open'}">${escapeHtml(t.dispute_status || 'Open')}</span>
        </div>
        <div style="font-size:0.85rem; margin-top:4px;">${escapeHtml(t.item_description)} — ${t.quantity_received}/${t.quantity_ordered} received</div>
        <div style="font-size:0.8rem; color:var(--text-secondary); margin-top:4px;">Reason: ${escapeHtml(t.dispute_reason || 'Not specified')}</div>
        ${t.dispute_notes ? `<div style="font-size:0.8rem; color:var(--text-muted); margin-top:4px; font-style:italic;">"${escapeHtml(t.dispute_notes)}"</div>` : ''}
      </div>
    `).join('');
  } catch (err) {
    console.error('Timeline error:', err);
    content.innerHTML = `<div style="color:var(--accent-rose); padding:20px; text-align:center;">Failed to load supplier timeline.</div>`;
  }
}
function renderCommunityBenchmarks(benchmarks) {
  communityBenchmarksBody.innerHTML = benchmarks.map(b => {
    const gradeClass = `grade-${b.grade.replace('+', 'plus')}`;
    return `
      <tr>
        <td><span style="font-weight: 700;">${escapeHtml(b.category)}</span></td>
        <td><span style="font-family: monospace;">${b.sample_size} deliveries verified</span></td>
        <td><span style="font-weight: 700; color: #818cf8;">${b.average_reliability}%</span></td>
        <td><span style="font-weight: 700; color: var(--accent-cyan);">${b.punctuality_rate}%</span></td>
        <td><span style="font-weight: 700; color: ${b.dispute_rate > 15 ? 'var(--accent-rose)' : 'inherit'};">${b.dispute_rate}%</span></td>
        <td><span class="grade-badge ${gradeClass}" style="width: 28px; height: 28px; font-size: 0.85rem;">${b.grade}</span></td>
      </tr>
    `;
  }).join('');
}

// NEW FUNCTION — paste this here
async function openSupplierTimelineModal(supplierId) {
  supplierTimelineModal.classList.add('active');
  const content = document.getElementById('supplier-timeline-content');
  const nameEl = document.getElementById('timeline-supplier-name');
  content.innerHTML = `<div style="text-align:center; padding:40px; color:var(--text-muted);"><i class="fa-solid fa-spinner fa-spin"></i> Loading dispute history...</div>`;

  try {
    const res = await fetch(`/api/suppliers/${supplierId}`);
    const result = await res.json();
    if (!result.success) {
      content.innerHTML = `<div style="color:var(--accent-rose); padding:20px; text-align:center;">Failed to load supplier timeline.</div>`;
      return;
    }

    const supplier = result.data;
    nameEl.textContent = `${supplier.name} · Evidence record, most recent first`;

    const disputes = (supplier.transactions || []).filter(t => t.has_dispute === 1);

    if (disputes.length === 0) {
      content.innerHTML = `
        <div style="text-align:center; padding:40px; color:var(--text-muted);">
          <i class="fa-solid fa-circle-check" style="font-size:2rem; color:var(--accent-emerald); margin-bottom:10px;"></i>
          <h3>No disputes on record</h3>
          <p style="font-size:0.85rem; margin-top:6px;">Every logged delivery from this supplier has been clean so far.</p>
        </div>`;
      return;
    }

    content.innerHTML = disputes.map(t => `
      <div style="border-left: 3px solid var(--accent-rose); padding: 10px 14px; margin-bottom: 12px; background: var(--bg-card); border-radius: 0 var(--radius-sm) var(--radius-sm) 0;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="font-weight:700;">${t.actual_date}</span>
          <span class="badge ${t.dispute_status === 'Resolved' ? 'badge-dispute-resolved' : 'badge-dispute-open'}">${escapeHtml(t.dispute_status || 'Open')}</span>
        </div>
        <div style="font-size:0.85rem; margin-top:4px;">${escapeHtml(t.item_description)} — ${t.quantity_received}/${t.quantity_ordered} received</div>
        <div style="font-size:0.8rem; color:var(--text-secondary); margin-top:4px;">Reason: ${escapeHtml(t.dispute_reason || 'Not specified')}</div>
        ${t.dispute_notes ? `<div style="font-size:0.8rem; color:var(--text-muted); margin-top:4px; font-style:italic;">"${escapeHtml(t.dispute_notes)}"</div>` : ''}
      </div>
    `).join('');
  } catch (err) {
    console.error('Timeline error:', err);
    content.innerHTML = `<div style="color:var(--accent-rose); padding:20px; text-align:center;">Failed to load supplier timeline.</div>`;
  }
}

  // 6. Community Supplier Benchmark Modal
  async function openCommunitySupplierModal(supplierId) {
    communitySupplierModal.classList.add('active');
    const content = document.getElementById('community-supplier-content');
    content.innerHTML = `<div style="text-align: center; padding: 40px; color: var(--text-muted);"><i class="fa-solid fa-spinner fa-spin"></i> Querying blinded community network...</div>`;

    try {
      const res = await fetch(`/api/community/supplier/${supplierId}`);
      const result = await res.json();

      if (!result.success || !result.data.has_community_data) {
        const d = result.data;
        const message = d && d.locked
          ? `You've logged <strong>${d.contributions_logged}</strong> transactions with this supplier. Log <strong>${d.contributions_needed} more</strong> to unlock the community network score (30 transactions unlocks it).`
          : `You are the first business in the network to score <strong>${escapeHtml(d ? d.supplier_name : 'this supplier')}</strong>. As other traders in your market add deliveries, aggregated scores will appear here automatically.`;

        content.innerHTML = `
          <div style="text-align: center; padding: 30px;">
            <i class="fa-solid fa-user-shield" style="font-size: 2.5rem; color: #818cf8; margin-bottom: 12px;"></i>
            <h3>${d && d.locked ? 'Keep Logging to Unlock' : 'No Community Pool Records Yet'}</h3>
            <p style="color: var(--text-secondary); font-size: 0.85rem; margin-top: 6px;">${message}</p>
          </div>
        `;
        return;
      }

      const d = result.data;
      const comm = d.communityScorecard;
      const priv = d.privateScorecard;

      content.innerHTML = `
        <div style="background: var(--bg-card); border-radius: var(--radius-md); padding: 18px; margin-bottom: 18px; border: 1px solid var(--border-color);">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <h4 style="font-size: 1.1rem; font-weight: 800;">${escapeHtml(d.supplier_name)}</h4>
              <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 4px;">
                Aggregated across <strong>${d.contributing_businesses} businesses</strong> · <strong>${d.total_community_transactions} total orders</strong>
              </div>
            </div>
            <div class="anonymity-seal"><i class="fa-solid fa-lock"></i> Blinded Data</div>
          </div>
        </div>

        <!-- Side-by-side comparison (Your Private Score vs Network Average) -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px;">
          <div style="background: rgba(79, 70, 229, 0.1); border: 1px solid rgba(79, 70, 229, 0.3); border-radius: var(--radius-sm); padding: 16px; text-align: center;">
            <div style="font-size: 0.75rem; color: var(--text-secondary); font-weight: 600;">Your Private Score</div>
            <div style="font-size: 1.8rem; font-weight: 800; color: #818cf8; margin: 4px 0;">${priv.composite_score}%</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">Grade ${priv.grade} (${priv.total_transactions} orders)</div>
          </div>

          <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: var(--radius-sm); padding: 16px; text-align: center;">
            <div style="font-size: 0.75rem; color: var(--text-secondary); font-weight: 600;">Community Network Average</div>
            <div style="font-size: 1.8rem; font-weight: 800; color: #34d399; margin: 4px 0;">${comm.composite_score}%</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">Grade ${comm.grade} (${d.total_community_transactions} orders)</div>
          </div>
        </div>

        <div class="score-dimension-list" style="background: var(--bg-card); padding: 16px; border-radius: var(--radius-sm);">
          <div class="dim-row">
            <span>Network Punctuality Rate:</span>
            <span style="font-weight: 700; color: var(--accent-cyan);">${comm.on_time_rate}% on-time</span>
          </div>
          <div class="dim-row">
            <span>Network Quantity Accuracy:</span>
            <span style="font-weight: 700; color: var(--accent-emerald);">${comm.accuracy_rate}% fill rate</span>
          </div>
          <div class="dim-row">
            <span>Network Quality Consistency:</span>
            <span style="font-weight: 700; color: var(--accent-amber);">${comm.avg_quality_stars} ★ rating</span>
          </div>
          <div class="dim-row">
            <span>Network Dispute Frequency:</span>
            <span style="font-weight: 700; color: ${comm.dispute_rate > 15 ? 'var(--accent-rose)' : 'inherit'};">${comm.dispute_rate}% dispute rate</span>
          </div>
        </div>
      `;
    } catch (err) {
      content.innerHTML = `<div style="color: var(--accent-rose); padding: 20px; text-align: center;">Failed to retrieve community data.</div>`;
    }
  }

  // 7. Dispute Notice AI Formatter
  async function generateDisputeNotice(transactionId) {
    disputeEvidenceModal.classList.add('active');

    const textArea = document.getElementById('dispute-evidence-text');
    const copyConfirm = document.getElementById('copy-confirm');

    copyConfirm.style.display = 'none';
    textArea.value = 'Generating structured reconciliation notice...';

    try {
      const res = await fetch('/api/ai/dispute-notice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          transaction_id: transactionId
        })
      });

      const result = await res.json();

      if (result.success) {
        textArea.value = result.data.formatted_message;
      } else {
        textArea.value = 'Error generating notice.';
      }

    } catch (err) {
      console.error('Dispute notice generation error:', err);
      textArea.value = 'Failed to generate notice.';
    }
  }

  // Copy Evidence Button
  document.getElementById('btn-copy-evidence').addEventListener('click', () => {
    const text = document.getElementById('dispute-evidence-text').value;

    navigator.clipboard.writeText(text).then(() => {
      const copyConfirm = document.getElementById('copy-confirm');

      copyConfirm.style.display = 'inline-block';

      setTimeout(() => {
        copyConfirm.style.display = 'none';
      }, 3000);
    }).catch(err => {
      console.error('Copy failed:', err);
    });
  });

  // Modal Handlers & Actions
  function openTransactionModal(preselectedSupplierId = '') {
    txForm.reset();

    const today = new Date().toISOString().split('T')[0];

    document.getElementById('tx-date-promised').value = today;
    document.getElementById('tx-date-actual').value = today;
    document.getElementById('tx-quality-rating').value = '5';

    txHasDispute.checked = false;
    disputeFields.style.display = 'none';

    if (preselectedSupplierId) {
      txSupplierSelect.value = preselectedSupplierId;
    }

    txModal.classList.add('active');
  }

  document.getElementById('btn-open-tx-modal').addEventListener('click', () => {
    openTransactionModal();
  });

  txForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const btnSave = document.getElementById('btn-save-tx');
    btnSave.disabled = true;

    const payload = {
      supplier_id: document.getElementById('tx-supplier-select').value,
      item_description: document.getElementById('tx-item').value.trim(),
      category: document.getElementById('tx-category').value,
      quantity_ordered: document.getElementById('tx-qty-ordered').value,
      quantity_received: document.getElementById('tx-qty-received').value,
      promised_date: document.getElementById('tx-date-promised').value,
      actual_date: document.getElementById('tx-date-actual').value,
      quality_rating: document.getElementById('tx-quality-rating').value,
      amount_pkr: document.getElementById('tx-amount').value,
      has_dispute: txHasDispute.checked ? 1 : 0,
      dispute_reason: document.getElementById('tx-dispute-reason').value,
      dispute_status: document.getElementById('tx-dispute-status').value,
      dispute_notes: document.getElementById('tx-dispute-notes').value.trim()
    };

    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const result = await res.json();

      if (result.success) {
        txModal.classList.remove('active');
        refreshAll();
      } else {
        alert(result.message || 'Error recording transaction');
      }

    } catch (err) {
      console.error(err);
      alert('Failed to submit transaction data');

    } finally {
      btnSave.disabled = false;
    }
  });

  // Supplier Add/Edit
  document.getElementById('btn-open-supplier-modal').addEventListener('click', () => {
    supplierForm.reset();
    document.getElementById('supplier-id').value = '';
    document.getElementById('supplier-modal-title').textContent = 'Register Supplier';
    document.getElementById('supplier-city').value = currentUser ? currentUser.city : 'Peshawar';
    supplierModal.classList.add('active');
  });

  function editSupplier(id) {
    const s = suppliersList.find(item => item.id == id);
    if (!s) return;

    document.getElementById('supplier-id').value = s.id;
    document.getElementById('supplier-name').value = s.name;
    document.getElementById('supplier-phone').value = s.phone;
    document.getElementById('supplier-category').value = s.category || 'Hardware & Tools';
    document.getElementById('supplier-city').value = s.city || 'Peshawar';
    document.getElementById('supplier-market').value = s.market_area || '';
    document.getElementById('supplier-terms').value = s.payment_terms || 'Cash on Delivery';
    document.getElementById('supplier-notes').value = s.notes || '';

    document.getElementById('supplier-modal-title').textContent = 'Edit Supplier Record';
    supplierModal.classList.add('active');
  }

  async function deleteSupplier(id) {
    if (!confirm('Are you sure you want to delete this supplier and all associated delivery records?')) return;
    try {
      const res = await fetch(`/api/suppliers/${id}`, { method: 'DELETE' });
      const result = await res.json();
      if (result.success) {
        refreshAll();
      } else {
        alert(result.message || 'Failed to delete supplier');
      }
    } catch (err) {
      alert('Error deleting supplier');
    }
  }

  async function deleteTransaction(id) {
    if (!confirm('Delete this transaction record from the ledger?')) return;
    try {
      const res = await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
      const result = await res.json();
      if (result.success) {
        refreshAll();
      }
    } catch (err) {
      alert('Error deleting transaction');
    }
  }

  supplierForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('supplier-id').value;
    const isEdit = Boolean(id);

    const payload = {
      name: document.getElementById('supplier-name').value.trim(),
      phone: document.getElementById('supplier-phone').value.trim(),
      category: document.getElementById('supplier-category').value,
      city: document.getElementById('supplier-city').value,
      market_area: document.getElementById('supplier-market').value.trim(),
      payment_terms: document.getElementById('supplier-terms').value,
      notes: document.getElementById('supplier-notes').value.trim()
    };

    const url = isEdit ? `/api/suppliers/${id}` : '/api/suppliers';
    const method = isEdit ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await res.json();

      if (result.success) {
        supplierModal.classList.remove('active');
        refreshAll();
      } else {
        alert(result.message || 'Error saving supplier');
      }
    } catch (err) {
      alert('Error saving supplier');
    }
  });

  // Filter Event Listeners
  document.getElementById('supplier-search').addEventListener('input', debounce(fetchSuppliers, 300));
  document.getElementById('supplier-category-filter').addEventListener('change', fetchSuppliers);
  document.getElementById('supplier-risk-filter').addEventListener('change', fetchSuppliers);

  document.getElementById('compare-category-filter').addEventListener('change', fetchComparisonMatrix);

  txSupplierFilter.addEventListener('change', fetchTransactions);
  document.getElementById('tx-dispute-filter').addEventListener('change', fetchTransactions);
  document.getElementById('tx-status-filter').addEventListener('change', fetchTransactions);
  document.getElementById('tx-search-input').addEventListener('input', debounce(fetchTransactions, 300));

  // Modal Closers
  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => {
      const modalId = btn.getAttribute('data-close');
      const targetModal = document.getElementById(modalId);
      if (targetModal) targetModal.classList.remove('active');
    });
  });

  window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
      e.target.classList.remove('active');
    }
  });

  // Logout
  document.getElementById('btn-logout').addEventListener('click', async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      window.location.href = '/login.html';
    }
  });

  // Helpers
  function escapeHtml(text) {
    if (!text) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function debounce(func, wait) {
    let timeout;
    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }
});