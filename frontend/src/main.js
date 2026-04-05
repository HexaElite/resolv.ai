/* ═══════════════════════════════════════════════════════════
   Resolv.AI — Main Application Entry
   ═══════════════════════════════════════════════════════════ */

import { initScene } from './scene.js';
import { initHomePage, destroyHomePage } from './home.js';
import * as api from './api.js';

// ── Home Page ───────────────────────────────────────────────
const homePage = document.getElementById('home-page');
const appOverlay = document.getElementById('app-overlay');

function enterDashboard() {
  destroyHomePage();
  homePage.style.transition = 'opacity 0.5s ease';
  homePage.style.opacity = '0';
  setTimeout(() => {
    homePage.style.display = 'none';
    appOverlay.style.display = 'flex';
    initScene();
    loadDashboard();
    pollAlerts();
    alertInterval = setInterval(pollAlerts, 10000);
  }, 500);
}

// Hide dashboard initially
appOverlay.style.display = 'none';

// Init home page
initHomePage();

// Wire up all "enter dashboard" buttons
document.getElementById('home-enter-btn')?.addEventListener('click', enterDashboard);
document.getElementById('hero-cta-btn')?.addEventListener('click', enterDashboard);
document.getElementById('hero-demo-btn')?.addEventListener('click', enterDashboard);
document.getElementById('cta-enter-btn')?.addEventListener('click', enterDashboard);

// Scroll progress dots
const scrollContainer = document.getElementById('home-scroll');
const dots = document.querySelectorAll('.scroll-dot');
const sectionIds = ['section-hero', 'section-features', 'section-how', 'section-cta'];

scrollContainer?.addEventListener('scroll', () => {
  const scrollTop = scrollContainer.scrollTop;
  const totalH = scrollContainer.scrollHeight - scrollContainer.clientHeight;
  const p = totalH > 0 ? scrollTop / totalH : 0;

  // Activate dot based on progress
  let activeIdx = 0;
  if (p >= 0.7) activeIdx = 3;
  else if (p >= 0.45) activeIdx = 2;
  else if (p >= 0.2) activeIdx = 1;

  dots.forEach((d, i) => d.classList.toggle('active', i === activeIdx));
});

// Dot click scrolls to section
dots.forEach((dot, i) => {
  dot.addEventListener('click', () => {
    const el = document.getElementById(sectionIds[i]);
    el?.scrollIntoView({ behavior: 'smooth' });
  });
});

// ── State ───────────────────────────────────────────────────
let currentView = 'dashboard';
let dashboardData = null;
let allRequests = [];
let alertInterval = null;

// ── Navigation ──────────────────────────────────────────────
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const view = btn.dataset.view;
    switchView(view);
  });
});

function switchView(view) {
  currentView = view;
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.querySelector(`[data-view="${view}"]`)?.classList.add('active');
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(`view-${view}`)?.classList.add('active');

  // Load data for view
  if (view === 'dashboard') loadDashboard();
  if (view === 'requests') loadRequests();
}

// ═══════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════
async function loadDashboard() {
  try {
    dashboardData = await api.getDashboard();
    renderMetricCards(dashboardData);
    renderStatusChart(dashboardData.by_status);
    renderPriorityChart(dashboardData.by_priority);

    // Load recent requests
    const requests = await api.getRequests();
    renderRecentRequests(requests.slice(0, 5));
  } catch (err) {
    console.error('Dashboard load failed:', err);
  }
}

function renderMetricCards(data) {
  const container = document.getElementById('metric-cards');
  const cards = [
    { icon: '📊', value: data.total, label: 'Total Requests', color: '#6366f1' },
    { icon: '🔓', value: data.open_count, label: 'Open', color: '#22d3ee' },
    { icon: '🚨', value: data.critical_count, label: 'Critical', color: '#ef4444' },
    { icon: '✅', value: data.completed_count, label: 'Completed', color: '#10b981' },
  ];

  container.innerHTML = cards.map(c => `
    <div class="metric-card">
      <div class="metric-glow" style="background:${c.color}"></div>
      <div class="metric-icon">${c.icon}</div>
      <div class="metric-value" style="color:${c.color}">${c.value}</div>
      <div class="metric-label">${c.label}</div>
    </div>
  `).join('');

  // Animate count-up
  container.querySelectorAll('.metric-value').forEach((el, i) => {
    animateCount(el, cards[i].value, cards[i].color);
  });
}

function animateCount(el, target, color) {
  let current = 0;
  const duration = 800;
  const start = performance.now();

  function update(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
    current = Math.round(target * eased);
    el.textContent = current;
    if (progress < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}

function renderStatusChart(byStatus) {
  const container = document.getElementById('status-bars');
  const maxVal = Math.max(...Object.values(byStatus), 1);
  const statusColors = {
    NEW: 'var(--status-new)',
    ASSIGNED: 'var(--status-assigned)',
    IN_PROGRESS: 'var(--status-inprogress)',
    COMPLETED: 'var(--status-completed)',
  };

  container.innerHTML = Object.entries(byStatus).map(([key, val]) => `
    <div class="bar-row">
      <span class="bar-label">${key.replace('_', ' ')}</span>
      <div class="bar-track">
        <div class="bar-fill" style="width:${(val / maxVal) * 100}%;background:${statusColors[key] || '#6366f1'}"></div>
      </div>
      <span class="bar-count">${val}</span>
    </div>
  `).join('');
}

function renderPriorityChart(byPriority) {
  const container = document.getElementById('priority-bars');
  const maxVal = Math.max(...Object.values(byPriority), 1);
  const prioColors = {
    LOW: 'var(--priority-low)',
    MEDIUM: 'var(--priority-medium)',
    HIGH: 'var(--priority-high)',
    CRITICAL: 'var(--priority-critical)',
  };

  container.innerHTML = Object.entries(byPriority).map(([key, val]) => `
    <div class="bar-row">
      <span class="bar-label">${key}</span>
      <div class="bar-track">
        <div class="bar-fill" style="width:${(val / maxVal) * 100}%;background:${prioColors[key] || '#6366f1'}"></div>
      </div>
      <span class="bar-count">${val}</span>
    </div>
  `).join('');
}

function renderRecentRequests(requests) {
  const container = document.getElementById('recent-list');
  container.innerHTML = requests.map(r => `
    <div class="recent-item" data-id="${r.id}">
      <span class="badge badge-${r.status.toLowerCase()}">${r.status.replace('_', ' ')}</span>
      <span class="ri-title">${r.title}</span>
      <span class="badge badge-${r.priority.toLowerCase()}">${r.priority}</span>
    </div>
  `).join('');

  container.querySelectorAll('.recent-item').forEach(item => {
    item.addEventListener('click', () => openDetail(parseInt(item.dataset.id)));
  });
}

// ═══════════════════════════════════════════════════════════
// REQUEST LIST
// ═══════════════════════════════════════════════════════════
async function loadRequests() {
  const statusFilter = document.getElementById('filter-status').value;
  const categoryFilter = document.getElementById('filter-category').value;
  const priorityFilter = document.getElementById('filter-priority').value;

  try {
    allRequests = await api.getRequests({
      status: statusFilter || undefined,
      category: categoryFilter || undefined,
      priority: priorityFilter || undefined,
    });
    renderRequestList(allRequests);
  } catch (err) {
    console.error('Requests load failed:', err);
  }
}

document.getElementById('filter-apply')?.addEventListener('click', loadRequests);

function renderRequestList(requests) {
  const container = document.getElementById('request-list');
  if (requests.length === 0) {
    container.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:40px">No requests found</p>';
    return;
  }

  container.innerHTML = requests.map(r => `
    <div class="request-card" data-id="${r.id}">
      <span class="rc-id">#${r.id}</span>
      <div class="rc-info">
        <div class="rc-title">${r.title}</div>
        <div class="rc-meta">${r.category} · ${r.location || 'No location'} · ${timeAgo(r.created_at)}</div>
      </div>
      <div class="rc-badges">
        <span class="badge badge-${r.status.toLowerCase()}">${r.status.replace('_', ' ')}</span>
        <span class="badge badge-${r.priority.toLowerCase()}">${r.priority}</span>
      </div>
    </div>
  `).join('');

  container.querySelectorAll('.request-card').forEach(card => {
    card.addEventListener('click', () => openDetail(parseInt(card.dataset.id)));
  });
}

// ═══════════════════════════════════════════════════════════
// NEW REQUEST FORM
// ═══════════════════════════════════════════════════════════
document.getElementById('request-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const submitBtn = document.getElementById('submit-btn');
  const btnText = submitBtn.querySelector('.btn-text');
  const btnLoading = submitBtn.querySelector('.btn-loading');
  btnText.classList.add('hidden');
  btnLoading.classList.remove('hidden');
  submitBtn.disabled = true;

  const data = {
    title: document.getElementById('req-title').value,
    description: document.getElementById('req-description').value,
    category: document.getElementById('req-category').value,
    priority: document.getElementById('req-priority').value,
    location: document.getElementById('req-location').value || null,
  };

  try {
    const result = await api.createRequest(data);
    showAIResult(result);
    document.getElementById('request-form').reset();
  } catch (err) {
    alert('Failed to create request: ' + (err.response?.data?.detail || err.message));
  } finally {
    btnText.classList.remove('hidden');
    btnLoading.classList.add('hidden');
    submitBtn.disabled = false;
  }
});

function showAIResult(result) {
  const panel = document.getElementById('ai-result-panel');
  const content = document.getElementById('ai-result-content');
  panel.classList.remove('hidden');

  const steps = result.resolution_steps || [];
  content.innerHTML = `
    <div class="ai-field">
      <span class="ai-label">Priority</span>
      <span class="ai-value"><span class="badge badge-${result.priority.toLowerCase()}">${result.priority}</span></span>
    </div>
    <div class="ai-field">
      <span class="ai-label">Category</span>
      <span class="ai-value"><span class="badge badge-${result.category.toLowerCase()}">${result.category}</span></span>
    </div>
    <div class="ai-field">
      <span class="ai-label">Summary</span>
      <span class="ai-value">${result.summary || 'N/A'}</span>
    </div>
    ${steps.length ? `
      <div class="ai-steps">
        <h4>AI Resolution Steps</h4>
        <ol>${steps.map(s => `<li>${s}</li>`).join('')}</ol>
      </div>
    ` : ''}
    <div style="margin-top:14px;font-size:12px;color:var(--text-muted)">
      ✅ Request #${result.id} created successfully
    </div>
  `;
}

// ═══════════════════════════════════════════════════════════
// REQUEST DETAIL MODAL
// ═══════════════════════════════════════════════════════════
async function openDetail(id) {
  try {
    const req = await api.getRequestById(id);
    renderDetail(req);
    document.getElementById('detail-modal').classList.remove('hidden');
  } catch (err) {
    console.error('Failed to load request:', err);
  }
}

function renderDetail(req) {
  const body = document.getElementById('detail-body');
  const steps = req.resolution_steps || [];

  // Determine next valid status
  const transitions = {
    NEW: 'ASSIGNED',
    ASSIGNED: 'IN_PROGRESS',
    IN_PROGRESS: 'COMPLETED',
  };
  const nextStatus = transitions[req.status] || null;

  body.innerHTML = `
    <div class="detail-header">
      <h2>${req.title}</h2>
      <div class="detail-badges">
        <span class="badge badge-${req.status.toLowerCase()}">${req.status.replace('_', ' ')}</span>
        <span class="badge badge-${req.priority.toLowerCase()}">${req.priority}</span>
        <span class="badge badge-${req.category.toLowerCase()}">${req.category}</span>
      </div>
    </div>

    <div class="detail-section">
      <h4>Description</h4>
      <p>${req.description}</p>
    </div>

    ${req.location ? `
    <div class="detail-section">
      <h4>Location</h4>
      <p>${req.location}</p>
    </div>` : ''}

    ${req.assigned_to ? `
    <div class="detail-section">
      <h4>Assigned To</h4>
      <p>${req.assigned_to}</p>
    </div>` : ''}

    ${req.summary ? `
    <div class="detail-section">
      <h4>🤖 AI Summary</h4>
      <p style="color:var(--accent-cyan)">${req.summary}</p>
    </div>` : ''}

    ${steps.length ? `
    <div class="ai-steps">
      <h4>🤖 AI Resolution Steps</h4>
      <ol>${steps.map(s => `<li>${s}</li>`).join('')}</ol>
    </div>` : ''}

    <div class="detail-section">
      <h4>Timeline</h4>
      <p>Created: ${new Date(req.created_at).toLocaleString()}<br>
      Updated: ${new Date(req.updated_at).toLocaleString()}</p>
    </div>

    <div class="detail-actions">
      ${nextStatus ? `<button class="btn btn-primary btn-sm" id="btn-advance-status" data-id="${req.id}" data-status="${nextStatus}">
        Move to ${nextStatus.replace('_', ' ')}
      </button>` : '<span class="badge badge-completed" style="font-size:12px;padding:6px 12px">✓ Completed</span>'}
      ${req.status === 'NEW' ? `<button class="btn btn-sm" id="btn-assign" data-id="${req.id}">Assign</button>` : ''}
    </div>
  `;

  // Wire up status advance button
  document.getElementById('btn-advance-status')?.addEventListener('click', async function () {
    try {
      const updated = await api.updateStatus(this.dataset.id, this.dataset.status);
      renderDetail(updated);
      loadDashboard(); // refresh stats
    } catch (err) {
      alert('Status update failed: ' + (err.response?.data?.detail || err.message));
    }
  });

  // Wire up assign button
  document.getElementById('btn-assign')?.addEventListener('click', async function () {
    const name = prompt('Assign to (name):');
    if (!name) return;
    try {
      const updated = await api.assignRequest(this.dataset.id, name);
      renderDetail(updated);
    } catch (err) {
      alert('Assignment failed: ' + (err.response?.data?.detail || err.message));
    }
  });
}

// Close modal
document.getElementById('modal-close')?.addEventListener('click', () => {
  document.getElementById('detail-modal').classList.add('hidden');
});
document.querySelector('.modal-backdrop')?.addEventListener('click', () => {
  document.getElementById('detail-modal').classList.add('hidden');
});

// ═══════════════════════════════════════════════════════════
// AI CHAT
// ═══════════════════════════════════════════════════════════
document.getElementById('chat-send')?.addEventListener('click', sendChat);
document.getElementById('chat-input')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') sendChat();
});

async function sendChat() {
  const input = document.getElementById('chat-input');
  const message = input.value.trim();
  if (!message) return;

  const messages = document.getElementById('chat-messages');
  messages.innerHTML += `
    <div class="chat-msg user">
      <div class="chat-avatar">You</div>
      <div class="chat-bubble">${escapeHtml(message)}</div>
    </div>
  `;
  input.value = '';
  messages.scrollTop = messages.scrollHeight;

  try {
    const result = await api.chatWithAI(message);
    let replyHtml = escapeHtml(result.reply).replace(/\n/g, '<br>');

    // If structured request returned, add a "Create Request" button
    if (result.structured_request) {
      replyHtml += `<br><br><button class="btn btn-primary btn-sm chat-create-btn" data-request='${JSON.stringify(result.structured_request)}'>📋 Create this request</button>`;
    }

    messages.innerHTML += `
      <div class="chat-msg ai">
        <div class="chat-avatar">AI</div>
        <div class="chat-bubble">${replyHtml}</div>
      </div>
    `;

    // Wire up create buttons
    messages.querySelectorAll('.chat-create-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        try {
          const reqData = JSON.parse(btn.dataset.request);
          const created = await api.createRequest(reqData);
          btn.textContent = `✅ Created request #${created.id}`;
          btn.disabled = true;
        } catch (err) {
          btn.textContent = '❌ Failed';
        }
      });
    });
  } catch (err) {
    messages.innerHTML += `
      <div class="chat-msg ai">
        <div class="chat-avatar">AI</div>
        <div class="chat-bubble" style="color:var(--accent-red)">Sorry, I couldn't process that. Please try again.</div>
      </div>
    `;
  }
  messages.scrollTop = messages.scrollHeight;
}

// ═══════════════════════════════════════════════════════════
// ALERTS
// ═══════════════════════════════════════════════════════════
async function pollAlerts() {
  try {
    const alerts = await api.getAlerts();
    const banner = document.getElementById('alert-banner');
    const indicator = document.getElementById('alert-indicator');

    if (alerts.length > 0) {
      banner.classList.remove('hidden');
      indicator.classList.remove('hidden');
      indicator.querySelector('.alert-count').textContent = alerts.length;

      banner.innerHTML = alerts.map(a => `
        <div class="alert-item">
          ${a.message}
          <button class="alert-dismiss" data-id="${a.id}" title="Dismiss">&times;</button>
        </div>
      `).join('');

      banner.querySelectorAll('.alert-dismiss').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          // Remove from UI immediately
          btn.parentElement.remove();
          if (banner.children.length === 0) {
            banner.classList.add('hidden');
            indicator.classList.add('hidden');
          }
        });
      });
    } else {
      banner.classList.add('hidden');
      indicator.classList.add('hidden');
    }
  } catch (err) {
    // Silently fail alert polling
  }
}

// ═══════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════
function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ═══════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════
loadDashboard();
pollAlerts();
alertInterval = setInterval(pollAlerts, 10000); // Poll every 10s
