const state = {
  config: null,
  scans: [],
  currentScan: null,
  isScanning: false,
  setupForcedOpen: false,
  scanStartedAt: null,
  longScanTimer: null,
  metricFilters: {
    platform: "",
    category: "",
  },
  sentimentFilter: "",
  sentimentAnimationScanId: "",
  trendRangeDays: 7,
  pendingStart: null,
};

const els = {
  landingPage: document.querySelector("#landingPage"),
  loginPage: document.querySelector("#loginPage"),
  appShell: document.querySelector("#appShell"),
  landingStartForm: document.querySelector("#landingStartForm"),
  landingWebsiteInput: document.querySelector("#landingWebsiteInput"),
  landingBusinessInput: document.querySelector("#landingBusinessInput"),
  googleLoginButton: document.querySelector("#googleLoginButton"),
  backToLandingButton: document.querySelector("#backToLandingButton"),
  profileMenuButton: document.querySelector("#profileMenuButton"),
  profileMenu: document.querySelector("#profileMenu"),
  profileBusinessLabel: document.querySelector("#profileBusinessLabel"),
  logoutButton: document.querySelector("#logoutButton"),
  scanForm: document.querySelector("#scanForm"),
  websiteInput: document.querySelector("#websiteInput"),
  businessInput: document.querySelector("#businessInput"),
  runButton: document.querySelector("#runButton"),
  propertyBar: document.querySelector("#propertyBar"),
  newScanButton: document.querySelector("#newScanButton"),
  overviewPanel: document.querySelector("#overview"),
  statusStrip: document.querySelector("#statusStrip"),
  statusText: document.querySelector("#statusText"),
  setupCard: document.querySelector("#setupCard"),
  providerStatus: document.querySelector("#providerStatus"),
  scoreHero: document.querySelector("#scoreHero"),
  mainScore: document.querySelector("#mainScore"),
  scoreSubtext: document.querySelector("#scoreSubtext"),
  platformPills: document.querySelector("#platformPills"),
  sideScore: document.querySelector("#sideScore"),
  mentionRate: document.querySelector("#mentionRate"),
  avgRank: document.querySelector("#avgRank"),
  overviewSentiment: document.querySelector("#overviewSentiment"),
  scoreDelta: document.querySelector("#scoreDelta"),
  mentionDelta: document.querySelector("#mentionDelta"),
  rankDelta: document.querySelector("#rankDelta"),
  sentimentDelta: document.querySelector("#sentimentDelta"),
  positiveRate: document.querySelector("#positiveRate"),
  sentimentBreakdown: document.querySelector("#sentimentBreakdown"),
  miniScore: document.querySelector("#miniScore"),
  trendLabel: document.querySelector("#trendLabel"),
  trendChart: document.querySelector("#trendChart"),
  trendRangeSelect: document.querySelector("#trendRangeSelect"),
  factorList: document.querySelector("#factorList"),
  sourceList: document.querySelector("#sourceList"),
  pageList: document.querySelector("#pageList"),
  actionList: document.querySelector("#actionList"),
  categoryList: document.querySelector("#categoryList"),
  overviewCompetitorList: document.querySelector("#overviewCompetitorList"),
  metricsPlatformSelect: document.querySelector("#metricsPlatformSelect"),
  metricsCategorySelect: document.querySelector("#metricsCategorySelect"),
  metricsPlatformIcon: document.querySelector("#metricsPlatformIcon"),
  metricsEmptyState: document.querySelector("#metricsEmptyState"),
  metricsResults: document.querySelector("#metricsResults"),
  promptGrid: document.querySelector("#promptGrid"),
  competitorGrid: document.querySelector("#competitorGrid"),
  sourceDetailList: document.querySelector("#sourceDetailList"),
  pageDetailList: document.querySelector("#pageDetailList"),
  insightGrid: document.querySelector("#insightGrid"),
  sentimentGrid: document.querySelector("#sentimentGrid"),
  evidenceRows: document.querySelector("#evidenceRows"),
  limitList: document.querySelector("#limitList"),
  emptyState: document.querySelector("#emptyState"),
  answerDialog: document.querySelector("#answerDialog"),
  dialogContent: document.querySelector("#dialogContent"),
  clearResultsButton: document.querySelector("#clearResultsButton"),
  developerEmailButton: document.querySelector("#developerEmailButton"),
  actionEmailButton: document.querySelector("#actionEmailButton"),
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
  init();
}

async function init() {
  bindLanding();
  bindNavigation();
  bindScan();
  bindClear();
  bindMetricFilters();
  bindTrendRange();
  bindDeveloperEmail();
  await loadInitialData();
}

function bindLanding() {
  const isLoggedIn = localStorage.getItem("gleoLoggedIn") === "true";
  showAppShell(isLoggedIn);

  document.querySelectorAll("[data-login-open]").forEach((button) => {
    button.addEventListener("click", () => showLoginPage());
  });

  els.landingStartForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    state.pendingStart = {
      website: els.landingWebsiteInput.value.trim(),
      businessName: els.landingBusinessInput.value.trim(),
    };
    showLoginPage();
  });

  els.googleLoginButton?.addEventListener("click", () => {
    localStorage.setItem("gleoLoggedIn", "true");
    showAppShell(true);
    applyPendingStart();
  });

  els.backToLandingButton?.addEventListener("click", () => showAppShell(false));

  els.profileMenuButton?.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleProfileMenu();
  });

  els.logoutButton?.addEventListener("click", () => {
    localStorage.removeItem("gleoLoggedIn");
    closeProfileMenu();
    showAppShell(false);
  });

  document.addEventListener("click", (event) => {
    if (!els.profileMenu?.contains(event.target) && !els.profileMenuButton?.contains(event.target)) {
      closeProfileMenu();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeProfileMenu();
  });
}

function showLoginPage() {
  els.landingPage?.classList.add("hidden");
  els.appShell?.classList.add("hidden");
  els.loginPage?.classList.remove("hidden");
}

function showAppShell(isVisible) {
  els.appShell?.classList.toggle("hidden", !isVisible);
  els.landingPage?.classList.toggle("hidden", isVisible);
  els.loginPage?.classList.add("hidden");
  if (!isVisible) state.setupForcedOpen = false;
}

function applyPendingStart() {
  if (!state.pendingStart) return;
  if (els.websiteInput) els.websiteInput.value = state.pendingStart.website || "";
  if (els.businessInput) els.businessInput.value = state.pendingStart.businessName || "";
  state.setupForcedOpen = true;
  renderSetupVisibility();
  els.runButton?.focus();
}

function bindNavigation() {
  document.querySelectorAll(".nav-item").forEach((button) => {
    button.addEventListener("click", () => {
      const panel = button.dataset.panel;
      document.querySelectorAll(".nav-item").forEach((item) => item.classList.toggle("active", item === button));
      document.querySelectorAll(".panels").forEach((item) => item.classList.toggle("active", item.id === panel));
      if (panel === "sentiment") renderSentiment();
    });
  });
}

function toggleProfileMenu() {
  const willOpen = els.profileMenu?.classList.contains("hidden");
  els.profileMenu?.classList.toggle("hidden", !willOpen);
  els.profileMenuButton?.setAttribute("aria-expanded", willOpen ? "true" : "false");
  renderProfileMenu();
}

function closeProfileMenu() {
  els.profileMenu?.classList.add("hidden");
  els.profileMenuButton?.setAttribute("aria-expanded", "false");
}

function renderProfileMenu() {
  if (!els.profileBusinessLabel) return;
  const scan = state.currentScan;
  els.profileBusinessLabel.textContent = scan?.businessName
    ? `${scan.businessName} · ${hostnameFor(scan.website || "") || "Current Site"}`
    : "No business selected";
}

function bindScan() {
  els.newScanButton?.addEventListener("click", () => {
    state.setupForcedOpen = true;
    if (state.currentScan) {
      if (els.websiteInput) els.websiteInput.value = state.currentScan.website || "";
      if (els.businessInput) els.businessInput.value = state.currentScan.businessName || "";
    }
    renderSetupVisibility();
    els.websiteInput?.focus();
  });

  els.scanForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const platforms = [...new FormData(els.scanForm).getAll("platforms")];

    if (!platforms.length) {
      setStatus("Choose at least one AI platform.", "error");
      return;
    }

    const payload = {
      website: els.websiteInput.value.trim(),
      businessName: els.businessInput.value.trim(),
      platforms,
    };

    setScanning(true);

    try {
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Scan failed.");

      state.currentScan = data.scan;
      state.scans.push(data.scan);
      state.setupForcedOpen = false;
      renderAll();

      const completed = data.scan.metrics.completedAnswers;
      const missing = data.scan.missingPlatforms.length
        ? ` Missing keys: ${data.scan.missingPlatforms.map(providerLabel).join(", ")}.`
        : "";
      setStatus(`Scan complete. ${completed} AI answers analyzed.${missing}`, completed ? "ready" : "error");
    } catch (error) {
      setStatus(error.message || "The scan could not complete.", "error");
    } finally {
      setScanning(false);
    }
  });
}

function bindClear() {
  if (!els.clearResultsButton) return;
  els.clearResultsButton.addEventListener("click", () => {
    state.currentScan = null;
    renderAll();
    setStatus("View cleared. Previous scans are still stored on the local server.", "working");
  });
}

function bindMetricFilters() {
  [els.metricsPlatformSelect, els.metricsCategorySelect].filter(Boolean).forEach((select) => {
    select.addEventListener("change", () => {
      state.metricFilters[select === els.metricsPlatformSelect ? "platform" : "category"] = select.value;
      animateControlChange(select, els.metricsResults);
      renderPrompts();
    });
  });
}

function bindTrendRange() {
  els.trendRangeSelect?.addEventListener("change", () => {
    state.trendRangeDays = Number(els.trendRangeSelect.value) || 7;
    animateControlChange(els.trendRangeSelect, els.trendChart);
    renderOverviewDeltas(state.currentScan?.metrics || null);
    renderTrend();
  });
}

function animateControlChange(control, target) {
  const wrappers = [control, control?.closest("label"), target].filter(Boolean);
  animateElements(wrappers);
}

function animateElements(items) {
  items.filter(Boolean).forEach((item) => {
    item.classList.remove("is-updating");
    void item.offsetWidth;
    item.classList.add("is-updating");
    window.setTimeout(() => item.classList.remove("is-updating"), 980);
  });
}

function bindDeveloperEmail() {
  [els.developerEmailButton, els.actionEmailButton].filter(Boolean).forEach((button) => {
    button.addEventListener("click", () => {
      const scan = state.currentScan;
      if (!getGroundedActions(scan).length) {
        setStatus("Run a scan with action items before sending a developer handoff.", "error");
        return;
      }
      window.open(buildDeveloperMailto(scan), "_blank", "noopener");
    });
  });
}

async function loadInitialData() {
  const [config, scansData] = await Promise.all([fetchJson("/api/config"), fetchJson("/api/scans")]);
  state.config = config;
  state.scans = scansData.scans || [];
  state.currentScan = state.scans.at(-1) || null;
  renderConfig();
  renderAll();

  if (!Object.values(state.config.providers).some((provider) => provider.configured)) {
    setStatus("Enter the website, business name, and location, then start the scan.", "working");
  }
}

function renderAll() {
  [
    renderConfig,
    renderOverview,
    renderPrompts,
    renderSources,
    renderInsights,
    renderSentiment,
    renderEvidence,
    renderTrend,
    renderProfileMenu,
  ].forEach((render) => {
    try {
      render();
    } catch (error) {
      console.error(`${render.name} failed`, error);
      if (render.name === "renderSentiment") {
        const fallback = document.querySelector("#sentimentGrid");
        if (fallback) fallback.innerHTML = emptyCard("Sentiment Render Error", error.message || "Sentiment could not render.");
      }
    }
  });
}

function renderConfig() {
  if (!state.config) return;

  if (els.providerStatus) {
    els.providerStatus.innerHTML = Object.entries(state.config.providers)
      .map(([key, provider]) => {
        const klass = provider.configured ? "ready" : "missing";
        return `
          <div class="provider-row ${klass}">
            <strong>${provider.label}</strong>
            <span>${provider.configured ? provider.model : "Missing key"}</span>
          </div>
        `;
      })
      .join("");
  }

  els.limitList.innerHTML = `
    <div class="stack-item"><strong>Crawl depth</strong><span>${state.config.limits.maxCrawlPages} pages per scan</span></div>
    <div class="stack-item"><strong>Prompt count</strong><span>${state.config.limits.maxScanPrompts} prompts per scan</span></div>
  `;

  const configuredPlatforms = new Set(
    Object.entries(state.config.providers)
      .filter(([, provider]) => provider.configured)
      .map(([key]) => key),
  );
  document.querySelectorAll("input[name='platforms']").forEach((input) => {
    const row = input.closest("label");
    if (!row) return;
    row.title = configuredPlatforms.has(input.value) ? "Configured" : "Missing API key";
    row.classList.toggle("missing", !configuredPlatforms.has(input.value));
  });
}

function renderOverview() {
  const scan = state.currentScan;
  const hasScan = Boolean(scan);
  const hasCompletedAnswers = Boolean(scan?.metrics.completedAnswers);
  els.emptyState.classList.toggle("hidden", hasScan);
  if (els.setupCard) els.setupCard.classList.add("hidden");
  els.scoreHero.hidden = !hasScan || !hasCompletedAnswers;
  renderSetupVisibility();
  setDeveloperButtonsVisible(Boolean(getGroundedActions(scan).length));

  if (!scan) {
    setSummaryValues();
    renderEmptyLists();
    return;
  }

  const metrics = scan.metrics;
  const score = valueOrDash(metrics.visibilityScore);
  els.mainScore.textContent = score;
  els.miniScore.textContent = metrics.visibilityScore === null ? "-" : `${metrics.visibilityScore}`;
  els.scoreSubtext.textContent = metrics.completedAnswers
    ? `${metrics.completedAnswers} answers analyzed across ${scan.configuredPlatforms.length} configured platform${scan.configuredPlatforms.length === 1 ? "" : "s"}.`
    : "No AI answers were completed. Check provider keys and try again.";
  setSummaryValues(metrics, scan);
  renderPlatformPills(metrics.platformScores);
}

function renderSetupVisibility() {
  if (!els.propertyBar) return;
  const hasCompletedScan = Boolean(state.currentScan?.metrics?.completedAnswers);
  const hideSetup = hasCompletedScan && !state.isScanning && !state.setupForcedOpen;
  els.propertyBar.classList.toggle("hidden", hideSetup);
  if (els.newScanButton) {
    els.newScanButton.hidden = !hasCompletedScan || state.isScanning || state.setupForcedOpen;
  }
  els.overviewPanel?.classList.remove("setup-skipped");
}

function renderCategories() {
  const scan = state.currentScan;
  const scores = scan?.metrics?.categoryScores || [];
  if (!els.categoryList) return;

  if (!scan || !scores.length) {
    els.categoryList.innerHTML = emptyStack("Run a scan to see which customer intents mention the business.");
    return;
  }

  els.categoryList.innerHTML = scores
    .map((category) => {
      const delta = scan.metrics.trend?.categoryDeltas?.find((item) => item.label === category.label);
      const movement = delta ? formatDelta(delta.mentionRateDelta, "%") : "First Scan";
      const rank = category.avgRank ? `Avg. rank #${category.avgRank}` : "Not ranked yet";
      return `
        <article class="category-row">
          <div>
            <strong>${escapeHtml(category.label)}</strong>
            <p>${category.mentionRate}% mention rate | ${rank}</p>
          </div>
          <div class="category-meter" aria-label="${escapeAttr(category.label)} mention rate">
            <span style="--w:${category.mentionRate}%"></span>
          </div>
          <span class="tag ${delta?.mentionRateDelta < 0 ? "negative" : delta?.mentionRateDelta > 0 ? "" : "warning"}">${escapeHtml(movement)}</span>
        </article>
      `;
    })
    .join("");
}

function setSummaryValues(metrics = null, scan = null) {
  const firstChoiceRate = metrics ? metrics.firstChoiceRate ?? deriveFirstChoiceRate(scan) : null;
  els.mentionRate.textContent = metrics ? `${firstChoiceRate}%` : "-";
  els.avgRank.textContent = metrics?.avgRank ? `#${metrics.avgRank}` : "-";
  if (els.overviewSentiment) {
    els.overviewSentiment.innerHTML = metrics?.completedAnswers
      ? `<span class="sentiment-percent">${metrics.positiveRate}%</span><span class="sentiment-word">Positive</span>`
      : "-";
  }
  if (els.positiveRate) els.positiveRate.textContent = metrics ? `${metrics.positiveRate}%` : "-";
  els.miniScore.textContent = metrics?.visibilityScore === null || !metrics ? "-" : `${metrics.visibilityScore}`;
  renderOverviewDeltas(metrics);
}

function renderOverviewDeltas(metrics = null) {
  const trend = metrics?.trend || {};
  setDelta(els.scoreDelta, trend.visibilityScoreDelta, "", "since previous scan");
  [els.mentionDelta, els.rankDelta, els.sentimentDelta].forEach((element) => {
    if (!element) return;
    element.hidden = true;
    element.innerHTML = "";
  });
}

function deriveFirstChoiceRate(scan) {
  const completed = (scan?.results || []).filter((result) => result.answer && !result.error);
  if (!completed.length) return 0;
  return percent(completed.filter((result) => result.ownMentioned && result.rank === 1).length, completed.length);
}

function setDelta(element, value, suffix = "", label = "vs last scan") {
  if (!element) return;
  element.hidden = false;
  if (!Number.isFinite(value)) {
    element.className = "kpi-change neutral";
    element.innerHTML = `<span class="delta-muted">First scan</span>`;
    return;
  }
  const isPositive = value > 0;
  const isNeutral = value === 0;
  const prefix = isPositive ? "+" : "";
  element.className = `kpi-change ${isPositive ? "positive" : value < 0 ? "negative" : "neutral"}`;
  element.innerHTML = `
    <span>${isNeutral ? "" : isPositive ? "▲" : "▼"} ${prefix}${formatCompactDelta(value)}${suffix}</span>
    <small>${escapeHtml(label)}</small>
  `;
}

function formatCompactDelta(value) {
  const rounded = Math.abs(value) >= 10 ? Math.round(value) : Math.round(value * 10) / 10;
  return String(rounded).replace(/\.0$/, "");
}

function renderOverviewCompetitors() {
  if (!els.overviewCompetitorList) return;
  const scan = state.currentScan;
  if (!scan?.metrics?.completedAnswers) {
    els.overviewCompetitorList.innerHTML = emptyStack("Competitor share appears after completed AI answers.");
    return;
  }

  const rows = [
    { name: "You", initials: "Y", mentionRate: scan.metrics.mentionRate, isYou: true },
    ...(scan.metrics.competitors || []).slice(0, 3).map((competitor) => ({
      name: competitor.name,
      initials: competitor.name
        .split(/\s+/)
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase(),
      mentionRate: competitor.mentionRate,
    })),
  ];
  const max = Math.max(...rows.map((row) => row.mentionRate), 1);
  els.overviewCompetitorList.innerHTML = rows
    .map(
      (row) => `
        <article class="share-row ${row.isYou ? "you" : ""}">
          <span class="share-avatar">${escapeHtml(row.initials)}</span>
          <strong>${escapeHtml(row.name)}</strong>
          <b>${row.mentionRate}%</b>
          <div class="share-track"><i style="--w:${Math.max(6, (row.mentionRate / max) * 100)}%"></i></div>
        </article>
      `,
    )
    .join("");
}

function renderPlatformPills(platformScores = []) {
  els.platformPills.innerHTML = platformScores.length
    ? platformScores
        .map(
          (platform) => `
            <div class="platform-pill">
              <span>${platform.label}</span>
              <strong>${platform.mentionRate}%</strong>
            </div>
          `,
        )
        .join("")
    : `<div class="platform-pill"><span>No platform results</span><strong>-</strong></div>`;
}

function renderFactors(scan) {
  const metrics = scan.metrics;
  const factors = [];

  if (metrics.mentionRate >= 50) {
    factors.push({ kind: "good", title: "Strong mention coverage", text: `${scan.businessName} appears in ${metrics.mentionRate}% of completed AI answers.`, tag: "Strength" });
  } else {
    factors.push({ kind: "warning", title: "Low mention coverage", text: `${scan.businessName} appears in ${metrics.mentionRate}% of completed AI answers.`, tag: "Opportunity" });
  }

  if (metrics.sourceQuality >= 40) {
    factors.push({ kind: "good", title: "Your site is being cited", text: `${metrics.sourceQuality}% of tracked citations point to your own domain.`, tag: "Strength" });
  } else {
    factors.push({ kind: "warning", title: "Third-party sources dominate", text: "AI answers are leaning on external sources or uncited answer text.", tag: "Opportunity" });
  }

  if (metrics.avgRank && metrics.avgRank <= 2) {
    factors.push({ kind: "good", title: "High answer placement", text: `Average position is #${metrics.avgRank} when mentioned.`, tag: "Strength" });
  } else {
    factors.push({ kind: "warning", title: "Position can improve", text: metrics.avgRank ? `Average position is #${metrics.avgRank} when mentioned.` : "The business was not ranked in completed answers.", tag: "Opportunity" });
  }

  els.factorList.innerHTML = factors
    .map(
      (factor) => `
        <article class="factor ${factor.kind === "warning" ? "warning" : ""}">
          ${factorIcon(factor.kind)}
          <div><strong>${escapeHtml(factor.title)}</strong><p>${escapeHtml(factor.text)}</p></div>
          <span class="tag ${factor.kind === "warning" ? "warning" : ""}">${factor.tag}</span>
        </article>
      `,
    )
    .join("");
}

function renderActions(actions = []) {
  if (!els.actionList) return;
  els.actionList.innerHTML = actions.length
    ? `
      <article class="action action-compact">
        <strong>${escapeHtml(actions[0].title)}</strong>
        <p>${escapeHtml(actions[0].evidence || actions[0].reason)}</p>
      </article>
    `
    : `<article class="action"><div><strong>No action items yet</strong><p>Run a scan with completed AI answers to generate recommendations.</p></div></article>`;
}

function renderPrompts() {
  const scan = state.currentScan;
  renderMetricControls(scan);

  if (!scan) {
    setMetricsResultsVisible(false);
    return;
  }

  const filters = getMetricFilters();
  const filteredResults = getFilteredResults(scan, filters);

  if (!filters.platform || !filters.category) {
    setMetricsResultsVisible(false);
    return;
  }

  setMetricsResultsVisible(true);

  const visiblePrompts = scan.prompts.filter((prompt) => prompt.category === filters.category);
  const topicResults = scan.results.filter(
    (result) =>
      result.category === filters.category &&
      (filters.platform === "all" || result.platform === filters.platform),
  );
  els.promptGrid.innerHTML = visiblePrompts.length
    ? renderMetricTopicCard(filters.category, visiblePrompts, topicResults, scan.businessName)
    : emptyCard("No Topic Results", "No completed answers matched this LLM/topic selection.");

  els.promptGrid.querySelectorAll("button[data-result]").forEach((button) => {
    button.addEventListener("click", () => showAnswer(button.dataset.result));
  });
}

function renderMetricControls(scan) {
  if (!els.metricsPlatformSelect || !els.metricsCategorySelect) return;

  if (!scan) {
    els.metricsPlatformSelect.innerHTML = `<option value="">Choose LLM</option>`;
    els.metricsCategorySelect.innerHTML = `<option value="">Choose Topic</option>`;
    els.metricsPlatformSelect.disabled = true;
    els.metricsCategorySelect.disabled = true;
    if (els.metricsPlatformIcon) els.metricsPlatformIcon.innerHTML = platformIconSvg("");
    return;
  }

  const currentPlatform = state.metricFilters.platform || els.metricsPlatformSelect.value || "";
  const currentCategory = state.metricFilters.category || els.metricsCategorySelect.value || "";
  const platformRows = [...new Map(scan.results.map((result) => [result.platform, result.platformLabel])).entries()].map(
    ([value, label]) => {
      const completed = scan.results.some((result) => result.platform === value && result.answer && !result.error);
      return { value, label, completed };
    },
  );
  const categories = [...new Set(scan.prompts.map((prompt) => prompt.category))];
  const promptCounts = new Map(categories.map((category) => [category, scan.prompts.filter((prompt) => prompt.category === category).length]));

  els.metricsPlatformSelect.disabled = false;
  els.metricsCategorySelect.disabled = false;
  els.metricsPlatformSelect.innerHTML = [
    `<option value="">Choose LLM</option>`,
    ...platformRows.map(
      (row) =>
        `<option value="${escapeAttr(row.value)}">${escapeHtml(row.label)}${row.completed ? "" : " (No Completed Answers)"}</option>`,
    ),
  ].join("");
  els.metricsCategorySelect.innerHTML = [
    `<option value="">Choose Topic</option>`,
    ...categories.map((category) => {
      const count = promptCounts.get(category) || 0;
      return `<option value="${escapeAttr(category)}">${escapeHtml(titleCaseLabel(category))}${count > 1 ? ` (${count} Prompts)` : ""}</option>`;
    }),
  ].join("");

  els.metricsPlatformSelect.value = platformRows.some((row) => row.value === currentPlatform) ? currentPlatform : "";
  els.metricsCategorySelect.value = categories.includes(currentCategory) ? currentCategory : "";
  els.metricsPlatformSelect.closest("label")?.setAttribute("data-platform", els.metricsPlatformSelect.value || "");
  if (els.metricsPlatformIcon) els.metricsPlatformIcon.innerHTML = platformIconSvg(els.metricsPlatformSelect.value);
}

function getMetricFilters() {
  return {
    platform: els.metricsPlatformSelect?.value || "",
    category: els.metricsCategorySelect?.value || "",
  };
}

function platformIconSvg(platform) {
  if (platform === "openai") {
    return `
      <svg viewBox="0 0 24 24" fill-rule="evenodd" aria-hidden="true">
        <path d="M9.205 8.658v-2.26c0-.19.072-.333.238-.428l4.543-2.616c.619-.357 1.356-.523 2.117-.523 2.854 0 4.662 2.212 4.662 4.566 0 .167 0 .357-.024.547l-4.71-2.759a.797.797 0 0 0-.856 0l-5.97 3.473Zm10.609 8.8V12.06c0-.333-.143-.57-.429-.737l-5.97-3.473 1.95-1.118a.433.433 0 0 1 .476 0l4.543 2.617c1.309.76 2.189 2.378 2.189 3.948 0 1.808-1.07 3.473-2.76 4.163ZM7.802 12.703l-1.95-1.142c-.167-.095-.239-.238-.239-.428V5.899c0-2.545 1.95-4.472 4.591-4.472 1 0 1.927.333 2.712.928L8.23 5.067c-.285.166-.428.404-.428.737v6.898ZM12 15.128l-2.795-1.57v-3.33L12 8.658l2.795 1.57v3.33L12 15.128Zm1.796 7.23c-1 0-1.927-.332-2.712-.927l4.686-2.712c.285-.166.428-.404.428-.737v-6.898l1.974 1.142c.167.095.238.238.238.428v5.233c0 2.545-1.974 4.472-4.614 4.472Zm-5.637-5.303-4.544-2.617c-1.308-.761-2.188-2.378-2.188-3.948A4.482 4.482 0 0 1 4.21 6.327v5.423c0 .333.143.571.428.738l5.947 3.449-1.95 1.118a.432.432 0 0 1-.476 0Zm-.262 3.9c-2.688 0-4.662-2.021-4.662-4.519 0-.19.024-.38.047-.57l4.686 2.71c.286.167.571.167.856 0l5.97-3.448v2.26c0 .19-.07.333-.237.428l-4.543 2.616c-.619.357-1.356.523-2.117.523Zm5.899 2.83a5.947 5.947 0 0 0 5.827-4.756C22.287 18.339 24 15.84 24 13.296c0-1.665-.713-3.282-1.998-4.448.119-.5.19-.999.19-1.498 0-3.401-2.759-5.947-5.946-5.947-.642 0-1.26.095-1.88.31A5.962 5.962 0 0 0 10.205 0a5.947 5.947 0 0 0-5.827 4.757C1.713 5.447 0 7.945 0 10.49c0 1.666.713 3.283 1.998 4.448-.119.5-.19 1-.19 1.499 0 3.401 2.759 5.946 5.946 5.946.642 0 1.26-.095 1.88-.309a5.96 5.96 0 0 0 4.162 1.713Z" />
      </svg>
    `;
  }
  if (platform === "openrouter") {
    return `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m4.7144 15.9555 4.7174-2.6471.079-.2307-.079-.1275h-.2307l-.7893-.0486-2.6956-.0729-2.3375-.0971-2.2646-.1214-.5707-.1215-.5343-.7042.0546-.3522.4797-.3218.686.0608 1.5179.1032 2.2767.1578 1.6514.0972 2.4468.255h.3886l.0546-.1579-.1336-.0971-.1032-.0972L6.973 9.8356l-2.55-1.6879-1.3356-.9714-.7225-.4918-.3643-.4614-.1578-1.0078.6557-.7225.8803.0607.2246.0607.8925.686 1.9064 1.4754 2.4893 1.8336.3643.3035.1457-.1032.0182-.0728-.164-.2733-1.3539-2.4467-1.445-2.4893-.6435-1.032-.17-.6194c-.0607-.255-.1032-.4674-.1032-.7285L6.287.1335 6.6997 0l.9957.1336.419.3642.6192 1.4147 1.0018 2.2282 1.5543 3.0296.4553.8985.2429.8318.091.255h.1579v-.1457l.1275-1.706.2368-2.0947.2307-2.6957.0789-.7589.3764-.9107.7468-.4918.5828.2793.4797.686-.0668.4433-.2853 1.8517-.5586 2.9021-.3643 1.9429h.2125l.2429-.2429.9835-1.3053 1.6514-2.0643.7286-.8196.85-.9046.5464-.4311h1.0321l.759 1.1293-.34 1.1657-1.0625 1.3478-.8804 1.1414-1.2628 1.7-.7893 1.36.0729.1093.1882-.0183 2.8535-.607 1.5421-.2794 1.8396-.3157.8318.3886.091.3946-.3278.8075-1.967.4857-2.3072.4614-3.4364.8136-.0425.0304.0486.0607 1.5482.1457.6618.0364h1.621l3.0175.2247.7892.522.4736.6376-.079.4857-1.2142.6193-1.6393-.3886-3.825-.9107-1.3113-.3279h-.1822v.1093l1.0929 1.0686 2.0035 1.8092 2.5075 2.3314.1275.5768-.3218.4554-.34-.0486-2.2039-1.6575-.85-.7468-1.9246-1.621h-.1275v.17l.4432.6496 2.3436 3.5214.1214 1.0807-.17.3521-.6071.2125-.6679-.1214-1.3721-1.9246L14.38 17.959l-1.1414-1.9428-.1397.079-.674 7.2552-.3156.3703-.7286.2793-.6071-.4614-.3218-.7468.3218-1.4753.3886-1.9246.3157-1.53.2853-1.9004.17-.6314-.0121-.0425-.1397.0182-1.4328 1.9672-2.1796 2.9446-1.7243 1.8456-.4128.164-.7164-.3704.0667-.6618.4008-.5889 2.386-3.0357 1.4389-1.882.929-1.0868-.0062-.1579h-.0546l-6.3385 4.1164-1.1293.1457-.4857-.4554.0608-.7467.2307-.2429 1.9064-1.3114Z" />
      </svg>
    `;
  }
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m12 2 1.6 5.4L19 9l-5.4 1.6L12 16l-1.6-5.4L5 9l5.4-1.6L12 2Z" />
    </svg>
  `;
}

function getFilteredResults(scan, { platform = "all", category = "all" } = {}) {
  return (scan?.results || []).filter(
    (result) =>
      result.answer &&
      !result.error &&
      (platform === "all" || result.platform === platform) &&
      (category === "all" || result.category === category),
  );
}

function setMetricsResultsVisible(isVisible) {
  els.metricsEmptyState?.classList.toggle("hidden", isVisible);
  els.metricsResults?.classList.toggle("hidden", !isVisible);
}

function renderMetricTopicCard(category, prompts, results, businessName) {
  const completedResults = results.filter((result) => result.answer && !result.error);
  const failedResults = results.filter((result) => result.error || !result.answer);
  const ownMentions = completedResults.filter((result) => result.ownMentioned).length;
  const ranks = completedResults.filter((result) => result.ownMentioned).map((result) => result.rank).filter(Number.isFinite);
  const avgRank = ranks.length ? `#${(ranks.reduce((sum, rank) => sum + rank, 0) / ranks.length).toFixed(1).replace(/\.0$/, "")}` : "-";
  const topChoiceRows = completedResults.map((result) => topChoiceForResult(result, businessName)).filter(Boolean);
  const ownTopChoices = topChoiceRows.filter((choice) => choice.isYou).length;
  const competitorTopChoiceMap = new Map();
  const competitorMentionMap = new Map();

  for (const choice of topChoiceRows) {
    if (choice.isYou) continue;
    competitorTopChoiceMap.set(choice.name, (competitorTopChoiceMap.get(choice.name) || 0) + 1);
  }

  for (const result of completedResults) {
    for (const business of result.businesses || []) {
      if (sameBusinessName(business, businessName)) continue;
      competitorMentionMap.set(business, (competitorMentionMap.get(business) || 0) + 1);
    }
  }

  const competitorMentions = [...competitorMentionMap.values()].reduce((sum, value) => sum + value, 0);
  const competitorTopChoices = [...competitorTopChoiceMap.values()].reduce((sum, value) => sum + value, 0);
  const totalTopChoices = ownTopChoices + competitorTopChoices;
  const useTopChoiceShare = totalTopChoices > 0;
  const totalShareUnits = useTopChoiceShare ? totalTopChoices : ownMentions + competitorMentions;
  const ownShare = totalShareUnits ? percent(useTopChoiceShare ? ownTopChoices : ownMentions, totalShareUnits) : 0;
  const competitorShare = totalShareUnits ? 100 - ownShare : 0;
  const ownBarShare = ownShare > 0 ? Math.max(5, ownShare) : 0;
  const competitorBarShare = competitorShare > 0 ? Math.max(5, competitorShare) : 0;
  const topCompetitors = [...competitorTopChoiceMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, rate: percent(count, totalTopChoices), count }));
  const mentionCompetitors = [...competitorMentionMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, rate: percent(count, ownMentions + competitorMentions), count }));
  const displayCompetitors = useTopChoiceShare ? topCompetitors : mentionCompetitors;
  const modeLabel = useTopChoiceShare ? "#1 Choice Share" : "Mention Share";
  const youLabel = useTopChoiceShare ? "You #1" : "You Mentioned";
  const competitorLabel = displayCompetitors.length === 1
    ? displayCompetitors[0].name
    : useTopChoiceShare
      ? "Competitors #1"
      : "Competitors Mentioned";
  const competitorNoteTitle = useTopChoiceShare ? "Competitor #1 Choices" : "Competitors Mentioned";
  const statusNote = !completedResults.length && failedResults.length
    ? buildProviderStatusNote(failedResults)
    : null;
  const completedCount = completedResults.length;
  const promptCount = prompts.length;
  const uniquePromptTexts = [...new Set(prompts.map((prompt) => prompt.text))];
  const ownFirstText = useTopChoiceShare
    ? `You were ranked first in ${ownTopChoices} of ${totalTopChoices} parsed first-choice answer${totalTopChoices === 1 ? "" : "s"}.`
    : `No clear #1 choice was parsed, so this shows mention share across ${completedCount} completed answer${completedCount === 1 ? "" : "s"}.`;

  return `
    <article class="metric-result-card">
      <div class="metric-card-main">
        <span class="metric-section-label">Search Topic</span>
        <div class="metric-prompt-list">
          ${uniquePromptTexts.map((text) => `<span>${escapeHtml(text)}</span>`).join("")}
        </div>
      </div>
      <div class="metric-bar-wrap" aria-label="Mention share">
        <div class="metric-mode-label">${escapeHtml(modeLabel)}</div>
        <div class="segmented-mention-bar">
          <i class="you-segment" style="--w:${ownBarShare}%"></i>
          ${
            displayCompetitors.length
              ? displayCompetitors
                  .map(
                    (item, index) =>
                      `<i class="competitor-segment competitor-segment-${index % 4}" style="--w:${Math.max(0, item.rate)}%"></i>`,
                  )
                  .join("")
              : competitorShare > 0
                ? `<i class="competitor-segment" style="--w:${competitorBarShare}%"></i>`
                : ""
          }
        </div>
        <div class="metric-card-stats">
          <span><b>${ownShare}%</b> ${escapeHtml(youLabel)}</span>
          <span><b>${competitorShare}%</b> ${escapeHtml(competitorLabel)}</span>
        </div>
        ${
          displayCompetitors.length > 1
            ? `<div class="metric-inline-competitors">${displayCompetitors
                .slice(0, 5)
                .map((item, index) => `<span style="--chip-color:${competitorColor(index)}">${escapeHtml(item.name)} ${item.rate}%</span>`)
                .join("")}</div>`
            : ""
        }
      </div>
      <aside class="metric-rank-card">
        <span>Your Average Rank</span>
        <strong>${escapeHtml(avgRank)}</strong>
        <small>${completedCount ? `out of ${completedCount} result${completedCount === 1 ? "" : "s"}` : "no completed results"}</small>
      </aside>
      ${
        statusNote
          ? `<div class="metric-card-note">
              <strong>${escapeHtml(titleCaseLabel(statusNote.title))}</strong>
              <p>${escapeHtml(statusNote.body)}</p>
            </div>`
          : `<div class="metric-card-note competitor-note">
              <strong>${escapeHtml(useTopChoiceShare ? "First-Choice Breakdown" : competitorNoteTitle)}</strong>
              <p>${escapeHtml(ownFirstText)}</p>
              ${
                displayCompetitors.length
                  ? `<div class="metric-competitor-list">${displayCompetitors.map((item, index) => `<span style="--chip-color:${competitorColor(index)}">${escapeHtml(item.name)} ${item.rate}%</span>`).join("")}</div>`
                  : ""
              }
            </div>`
      }
    </article>
  `;
}

function topChoiceForResult(result, businessName) {
  if (!result?.answer) return null;
  if (result.ownMentioned && result.rank === 1) {
    return { name: businessName, isYou: true };
  }
  const competitor = (result.businesses || []).find((business) => !sameBusinessName(business, businessName));
  return competitor ? { name: competitor, isYou: false } : null;
}

function competitorColor(index) {
  return ["#2472f5", "#3f4358", "#7c5cff", "#0e8bb5"][index % 4];
}

function buildProviderStatusNote(results) {
  const first = results[0];
  const platform = first?.platformLabel || "This LLM";
  const reason = first?.error || "The provider returned no answer text for this prompt.";
  return {
    title: "No Completed Answer",
    body: `${platform} did not return usable answer text for this scan. ${reason}`,
  };
}

function buildPromptInsight({ ownRate, competitorRate, avgRank, topCompetitors, prompt, results }) {
  if (!results.length) {
    return {
      title: "No answer data yet",
      body: "This prompt did not return a completed AI answer for the selected LLM.",
    };
  }

  if (competitorRate > ownRate) {
    const competitorText = topCompetitors[0]?.name ? `${topCompetitors[0].name} is showing up more often here.` : "Competitors are showing up more often here.";
    return {
      title: "Visibility gap",
      body: `${competitorText} Strengthen the page content that directly answers this prompt: ${prompt.text}.`,
    };
  }

  if (ownRate > 0 && avgRank !== "-" && Number(avgRank.replace("#", "")) > 2) {
    return {
      title: "Ranking opportunity",
      body: "The business is mentioned, but it is not near the top of the answer. Add clearer proof, service-area wording, and comparison-friendly details.",
    };
  }

  if (ownRate > 0) {
    return {
      title: "Good coverage",
      body: "The business appears for this prompt. Keep the supporting page copy specific, crawlable, and aligned with this customer question.",
    };
  }

  return {
    title: "Missing mention",
    body: "The AI answer did not mention the business for this prompt. Add a direct FAQ or section using this customer-style wording.",
  };
}

function insightDriverForAction(action, scan) {
  const mentions = (scan.results || []).filter((result) => result.ownMentioned);
  const negativeCount = mentions.filter((result) => result.sentiment === "negative").length;
  const uncertainCount = mentions.filter((result) => /unclear|cannot verify|could not verify|limited information/i.test(`${result.answer} ${result.context}`)).length;
  const ownCitationCount = scan.metrics?.sources?.ownCitationCount || 0;
  const totalCitationCount = scan.metrics?.sources?.totalCitationCount || 0;
  const actionText = `${action.title} ${action.reason}`.toLowerCase();

  if (negativeCount && /sentiment|risk|proof|trust|recommendation/.test(actionText)) {
    return `${negativeCount} mention${negativeCount === 1 ? "" : "s"} had negative context.`;
  }

  if (uncertainCount && /verify|availability|hours|proof|trust|recommendation/.test(actionText)) {
    return `${uncertainCount} mention${uncertainCount === 1 ? "" : "s"} included uncertainty or limited-verification language.`;
  }

  if (totalCitationCount && /cite|source|page|crawl/.test(actionText)) {
    return `${ownCitationCount} of ${totalCitationCount} tracked citations pointed to your site.`;
  }

  const topContext = buildMentionContextTypes(mentions).sort((a, b) => b.value - a.value)[0];
  return topContext?.value ? `${topContext.label} appeared in ${topContext.value} mention${topContext.value === 1 ? "" : "s"}.` : "";
}

function renderCategoryPerformance(scan, results, filters) {
  if (!els.categoryList) return;
  if (!scan || !filters?.category) {
    els.categoryList.innerHTML = emptyStack("Choose an LLM and topic to view performance.");
    return;
  }

  const mentions = results.filter((result) => result.ownMentioned);
  const ranks = mentions.map((result) => result.rank).filter(Number.isFinite);
  const mentionRate = percent(mentions.length, results.length);
  const avgRank = ranks.length ? `#${(ranks.reduce((sum, value) => sum + value, 0) / ranks.length).toFixed(1).replace(/\.0$/, "")}` : "-";
  const sentiment = {
    positive: mentions.filter((result) => result.sentiment === "positive").length,
    neutral: mentions.filter((result) => result.sentiment === "neutral").length,
    negative: mentions.filter((result) => result.sentiment === "negative").length,
  };

  els.categoryList.innerHTML = `
    <article class="metric-summary-card">
          <span>${escapeHtml(titleCaseLabel(filters.category))}</span>
      <strong>${results.length ? `${mentionRate}%` : "-"}</strong>
      <p>Mention rate for this LLM/topic selection.</p>
    </article>
    <article class="metric-summary-card">
      <span>Average Rank</span>
      <strong>${avgRank}</strong>
      <p>Placement when the business is mentioned.</p>
    </article>
    <article class="metric-summary-card">
      <span>Sentiment</span>
      <strong>${sentiment.positive}/${sentiment.neutral}/${sentiment.negative}</strong>
      <p>Positive / Neutral / Negative mentions.</p>
    </article>
  `;
}

function renderFilteredCompetitors(scan, results) {
  if (!els.overviewCompetitorList) return;
  if (!scan || !results.length) {
    els.overviewCompetitorList.innerHTML = emptyStack("Competitor mentions appear after completed AI answers.");
    return;
  }

  const ownMentions = results.filter((result) => result.ownMentioned).length;
  const competitorMap = new Map();
  for (const result of results) {
    for (const business of result.businesses || []) {
      if (sameBusinessName(business, scan.businessName)) continue;
      const current = competitorMap.get(business) || { name: business, mentions: 0 };
      current.mentions += 1;
      competitorMap.set(business, current);
    }
  }

  const rows = [
    { name: "You", initials: "Y", mentionRate: percent(ownMentions, results.length), isYou: true },
    ...[...competitorMap.values()]
      .sort((a, b) => b.mentions - a.mentions)
      .slice(0, 5)
      .map((competitor) => ({
        name: competitor.name,
        initials: initialsFor(competitor.name),
        mentionRate: percent(competitor.mentions, results.length),
      })),
  ];
  const max = Math.max(...rows.map((row) => row.mentionRate), 1);

  els.overviewCompetitorList.innerHTML = rows
    .map(
      (row) => `
        <article class="share-row ${row.isYou ? "you" : ""}">
          <span class="share-avatar">${escapeHtml(row.initials)}</span>
          <strong>${escapeHtml(row.name)}</strong>
          <b>${row.mentionRate}%</b>
          <div class="share-track"><i style="--w:${Math.max(6, (row.mentionRate / max) * 100)}%"></i></div>
        </article>
      `,
    )
    .join("");
}

function renderCompetitors() {
  if (!els.competitorGrid) return;
  const competitors = state.currentScan?.metrics.competitors || [];
  els.competitorGrid.innerHTML = competitors.length
    ? competitors
        .map(
          (competitor, index) => `
            <article class="competitor-card">
              <span class="tag">${index === 0 ? "Top competitor" : `#${index + 1}`}</span>
              <strong>${escapeHtml(competitor.name)}</strong>
              <span class="rate">${competitor.mentionRate}%</span>
              <p>${competitor.mentions} mention${competitor.mentions === 1 ? "" : "s"}${competitor.avgRank ? `, avg. rank #${competitor.avgRank}` : ""}.</p>
              <div class="competitor-meta"><span class="tag warning">${escapeHtml(competitor.why)}</span></div>
            </article>
          `,
        )
        .join("")
    : emptyCard("No competitors detected yet", "Completed AI answers will be parsed for competing businesses.");
}

function renderSources() {
  const sources = state.currentScan?.metrics.sources.topSources || [];
  const pages = state.currentScan?.metrics.sources.citedPages || [];

  els.sourceDetailList.innerHTML = sources.length
    ? sources
        .map(
          (source) => `
            <article class="stack-item">
              <strong>${escapeHtml(source.host)}</strong>
              <p>${source.count} citation${source.count === 1 ? "" : "s"}</p>
              ${source.examples?.[0] ? `<a href="${escapeAttr(source.examples[0])}" target="_blank" rel="noreferrer">${escapeHtml(source.examples[0])}</a>` : ""}
            </article>
          `,
        )
        .join("")
    : emptyStack("No cited sources returned yet.");

  els.pageDetailList.innerHTML = pages.length
    ? pages
        .map(
          (page) => `
            <article class="stack-item">
              <strong>${escapeHtml(page.title)}</strong>
              <p>${page.count} citation${page.count === 1 ? "" : "s"}</p>
              <a href="${escapeAttr(page.url)}" target="_blank" rel="noreferrer">${escapeHtml(page.url)}</a>
            </article>
          `,
        )
        .join("")
    : emptyStack("No own-site pages were cited yet.");
}

function renderInsights() {
  const scan = state.currentScan;
  const actions = getGroundedActions(scan);
  if (!scan?.metrics?.completedAnswers || !actions.length) {
    els.insightGrid.innerHTML = emptyCard("No Actionable Insights Yet", "Run a completed scan to generate grounded problems and fixes from mention, sentiment, source, and competitor signals.");
    return;
  }

  els.insightGrid.innerHTML = `
    <article class="insight-board ${actions.length === 1 ? "single-insight" : ""}">
      <div class="insight-board-list">
        <div class="insight-board-head">
          <span>Problem</span>
          <span>Solution</span>
        </div>
        ${actions
          .map((action, index) => {
            const problem = conciseProblem(action);
            const solution = conciseSolution(action);
            return `
              <div class="insight-board-row">
                <span class="insight-row-icon" aria-hidden="true">${insightIcon(index)}</span>
                <div>
                  <strong>${escapeHtml(titleCaseLabel(action.title))}</strong>
                  <p>${escapeHtml(problem)}</p>
                </div>
                <div>
                  <strong>${escapeHtml(solutionTitle(action))}</strong>
                  <p>${escapeHtml(solution)}</p>
                </div>
              </div>
            `;
          })
          .join("")}
      </div>
      <aside class="insight-send-panel">
        <span class="send-orb" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M21 3 9.4 14.6M21 3l-7.4 18-4.2-6.4L3 10.4 21 3Z" /></svg></span>
        <strong>Send all insights to your developer</strong>
        <p>Share all recommendations in one click.</p>
        <a class="email-button insight-send-button border-beam-button" href="${escapeAttr(buildDeveloperMailto(scan, actions))}" target="_blank" rel="noreferrer">
          Send to Developer
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.2 5.8 19.4 12l-6.2 6.2-1.4-1.4 3.8-3.8H4v-2h11.6l-3.8-3.8 1.4-1.4Z" /></svg>
        </a>
      </aside>
    </article>
  `;

  els.insightGrid.querySelectorAll("[data-send-insight]").forEach((button) => {
    button.addEventListener("click", () => {
      const action = actions[Number(button.dataset.sendInsight)];
      window.open(buildDeveloperMailto(scan, action ? [action] : actions), "_blank", "noopener");
    });
  });

}

function renderSentiment() {
  const sentimentGrid = els.sentimentGrid || document.querySelector("#sentimentGrid");
  if (!sentimentGrid) return;
  els.sentimentGrid = sentimentGrid;
  const scan = state.currentScan;
  if (!scan?.metrics?.completedAnswers) {
    sentimentGrid.innerHTML = emptyCard("No Sentiment Yet", "Run a scan to see Positive, Neutral, and Negative AI mention context.");
    return;
  }

  const mentions = scan.results.filter((result) => result.ownMentioned);
  const selectedSentiment = ["positive", "neutral", "negative"].includes(state.sentimentFilter) ? state.sentimentFilter : "";
  const sentimentMentions = mentions;
  const contextMentions = selectedSentiment ? mentions.filter((result) => result.sentiment === selectedSentiment) : mentions;
  const sentimentCounts = {
    positive: sentimentMentions.filter((result) => result.sentiment === "positive").length,
    neutral: sentimentMentions.filter((result) => result.sentiment === "neutral").length,
    negative: sentimentMentions.filter((result) => result.sentiment === "negative").length,
  };
  const rows = [
    { label: "Positive", value: sentimentCounts.positive, className: "positive" },
    { label: "Neutral", value: sentimentCounts.neutral, className: "neutral" },
    { label: "Negative", value: sentimentCounts.negative, className: "negative" },
  ];
  const total = sentimentMentions.length || 1;
  const positiveShare = percent(sentimentCounts.positive, total);
  const activeFilterIcon = selectedSentiment || "all";
  const sentimentPanelActive = document.querySelector("#sentiment")?.classList.contains("active");
  const shouldAnimateSentiment = sentimentPanelActive && state.sentimentAnimationScanId !== scan.id;

  sentimentGrid.innerHTML = `
    <article class="dashboard-card sentiment-overview-card ${shouldAnimateSentiment ? "animate-in" : ""}">
      <div class="sentiment-gauge" data-score="${positiveShare}" style="--score:${shouldAnimateSentiment ? 0 : positiveShare}; --score-deg:${(shouldAnimateSentiment ? 0 : positiveShare) * 1.8}deg">
        <div class="gauge-arc"></div>
        <strong data-animated-number="${positiveShare}">${shouldAnimateSentiment ? 0 : positiveShare}</strong>
        <span>Mention Sentiment</span>
      </div>
      <div class="sentiment-side">
        <div class="sentiment-bars">
          ${rows
            .map(
              (row) => `
                <button class="sentiment-bar-row ${row.className} ${selectedSentiment === row.className ? "active" : ""}" type="button" data-sentiment-filter="${escapeAttr(row.className)}">
                  <span class="sentiment-face ${row.className}" aria-hidden="true">${sentimentFaceIcon(row.className)}</span>
                  <span>${row.label}</span>
                  <strong>${row.value}</strong>
                  <div class="bar-track"><i style="--w:${percent(row.value, total)}%"></i></div>
                </button>
              `,
            )
            .join("")}
        </div>
      </div>
    </article>
    <div class="sentiment-lower-grid">
      <article class="dashboard-card sentiment-topic-card-wide">
        <div class="mention-context-head">
          <h2>Mention Context</h2>
          <label class="context-filter-control ${escapeAttr(activeFilterIcon)}">
            <span>Filter</span>
            <span class="context-filter-face" aria-hidden="true">${sentimentFaceIcon(activeFilterIcon)}</span>
            <select id="sentimentContextSelect">
              <option value="">All Sentiment</option>
              <option value="positive" ${selectedSentiment === "positive" ? "selected" : ""}>Positive</option>
              <option value="neutral" ${selectedSentiment === "neutral" ? "selected" : ""}>Neutral</option>
              <option value="negative" ${selectedSentiment === "negative" ? "selected" : ""}>Negative</option>
            </select>
          </label>
        </div>
        <div class="topic-sentiment-result">
          ${renderSelectedTopicSentiment(null, contextMentions, scan.businessName, selectedSentiment)}
        </div>
      </article>
    </div>
  `;

  const contextSelect = document.querySelector("#sentimentContextSelect");
  if (shouldAnimateSentiment) {
    animateMentionSentiment(scan.id);
  }
  contextSelect?.addEventListener("change", () => {
    state.sentimentFilter = contextSelect.value;
    renderSentiment();
    animateElements([
      document.querySelector(".topic-sentiment-result"),
    ]);
  });
  document.querySelectorAll("[data-sentiment-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      state.sentimentFilter = state.sentimentFilter === button.dataset.sentimentFilter ? "" : button.dataset.sentimentFilter;
      renderSentiment();
      animateElements([
        document.querySelector(".topic-sentiment-result"),
      ]);
    });
  });
  document.querySelectorAll("[data-context-info]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const row = button.closest(".topic-context-row");
      document.querySelectorAll(".topic-context-row.info-open").forEach((item) => {
        if (item !== row) item.classList.remove("info-open");
      });
      row?.classList.toggle("info-open");
    });
  });
}

function sentimentFaceIcon(kind) {
  if (kind === "all") {
    return `<svg viewBox="0 0 24 24"><path d="M4 6h16v3H4V6Zm0 5h16v3H4v-3Zm0 5h16v3H4v-3Z" /></svg>`;
  }
  if (kind === "negative") {
    return `<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20ZM8 9.5a1.2 1.2 0 1 1 2.4 0A1.2 1.2 0 0 1 8 9.5Zm5.6 0a1.2 1.2 0 1 1 2.4 0 1.2 1.2 0 0 1-2.4 0ZM8 17c.7-1.8 2.1-2.8 4-2.8s3.3 1 4 2.8h-2c-.4-.7-1.1-1-2-1s-1.6.3-2 1H8Z" /></svg>`;
  }
  if (kind === "neutral") {
    return `<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20ZM8 9.5a1.2 1.2 0 1 1 2.4 0A1.2 1.2 0 0 1 8 9.5Zm5.6 0a1.2 1.2 0 1 1 2.4 0 1.2 1.2 0 0 1-2.4 0ZM8 15h8v2H8v-2Z" /></svg>`;
  }
  return `<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20ZM8 9.5a1.2 1.2 0 1 1 2.4 0A1.2 1.2 0 0 1 8 9.5Zm5.6 0a1.2 1.2 0 1 1 2.4 0 1.2 1.2 0 0 1-2.4 0ZM7.5 13h2a2.7 2.7 0 0 0 5 0h2a4.7 4.7 0 0 1-9 0Z" /></svg>`;
}

function animateMentionSentiment(scanId = "") {
  const gauge = document.querySelector(".sentiment-gauge");
  const number = document.querySelector("[data-animated-number]");
  const target = Number(number?.dataset.animatedNumber || 0);
  if (!gauge || !number || !Number.isFinite(target)) return;
  state.sentimentAnimationScanId = scanId;

  const duration = 900;
  const startedAt = performance.now();
  const tick = (now) => {
    const progress = Math.min(1, (now - startedAt) / duration);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(target * eased);
    gauge.style.setProperty("--score", current);
    gauge.style.setProperty("--score-deg", `${current * 1.8}deg`);
    number.textContent = String(current);
    if (progress < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function renderContextRankList(contextTypes) {
  const rows = contextTypes
    .filter((row) => row.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 3);

  if (!rows.length) {
    return `<article class="context-rank-row empty"><p>No clear mention context detected yet.</p></article>`;
  }

  return rows
    .map(
      (row, index) => `
        <article class="context-rank-row ${index === 0 ? "primary" : ""}">
          <span>${index + 1}</span>
          <div>
            <strong>${escapeHtml(row.label)}</strong>
            <p>Mentioned ${row.value} Time${row.value === 1 ? "" : "s"}</p>
          </div>
        </article>
      `,
    )
    .join("");
}

function renderSelectedTopicSentiment(row, mentions = [], businessName = "", sentiment = "") {
  if (!mentions.length) {
    const label = sentiment ? `${titleCaseLabel(sentiment)} mention context` : "mention context";
    return `<article class="topic-sentiment-empty"><p>No ${escapeHtml(label)} was found for this scan yet.</p></article>`;
  }

  const contextCards = buildTopicContextEvidence(mentions, sentiment, businessName).slice(0, 4);

  return `
    <article class="selected-topic-card">
      <div class="topic-context-leaderboard">
        ${
          contextCards.length
            ? contextCards
                .map(
                  (item, index) => `
                    <article class="topic-context-row ${index === 0 ? "primary" : ""}">
                      <span>${index + 1}</span>
                      <div>
                        <strong>${escapeHtml(item.label)}</strong>
                        <button class="context-info-button" type="button" data-context-info aria-label="${escapeAttr(firstSentence(item.summary, 180))}">i</button>
                        <p class="context-info-popover">${escapeHtml(firstSentence(item.summary, 180))}</p>
                      </div>
                    </article>
                  `,
                )
                .join("")
            : `<article class="topic-context-row"><span>1</span><div><strong>No ${escapeHtml(titleCaseLabel(sentiment || "Clear"))} Context Yet</strong></div></article>`
        }
      </div>
    </article>
  `;
}

function buildTopicSignals(mentions) {
  const definitions = [
    { label: "Trusted Community Presence", pattern: /trusted|reviews|reputable|local|established|experienced|recognized|well-established|community/i },
    { label: "Service Availability", pattern: /hours|timings|open|schedule|booking|availability|available|contact|appointment/i },
    { label: "Specific Service Fit", pattern: /pooja|puja|aarthi|aarti|darshan|festival|ritual|ceremony|class|program|service|offers|provides|specializ/i },
    { label: "Community Access", pattern: /community access|community|access|donation|non-profit|nonprofit|serving|families|devotees/i },
    { label: "Budget / Value Framing", pattern: /budget|affordable|low cost|value|cost|donation|payment/i },
    { label: "Limited Verification", pattern: /unclear|cannot verify|limited information|not enough|hard to tell/i },
  ];
  return definitions
    .map((definition) => ({
      label: definition.label,
      count: mentions.filter((result) => definition.pattern.test(`${result.answer} ${result.context}`)).length,
    }))
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);
}

function buildTopicContextEvidence(mentions, sentiment = "", businessName = "") {
  const definitionsBySentiment = {
    positive: [
      { label: "Trusted Community Presence", pattern: /trusted|reviews|reputable|local|established|experienced|recognized|well-established/i },
      { label: "Community And Family Access", pattern: /community|family|families|children|parents|devotees|members|accessible|welcoming/i },
      { label: "Religious Events And Poojas", pattern: /pooja|puja|aarthi|aarti|abhishekam|festival|ritual|ceremony|darshan|bhajan|katha/i },
      { label: "Classes And Programs", pattern: /class|classes|program|programs|cultural|language|sloka|gurukul|yoga|education/i },
      { label: "Specific Service Fit", pattern: /specializ|expert|focused|known for|good for|offers|provides|available/i },
    ],
    neutral: [
      { label: "Location Mention", pattern: /location|located|near|area|local|serves|serving/i },
      { label: "General Service Fit", pattern: /program|service|offer|provides|available|temple|foundation|business/i },
      { label: "Needs More Verifiable Proof", pattern: /may|might|could|appears|limited details|not clear|unclear/i },
      { label: "Listed As An Option", pattern: /mentioned|listed|option|consider|search/i },
    ],
    negative: [
      { label: "Cannot Verify Details", pattern: /unclear|cannot verify|could not verify|limited information|not enough|hard to tell|limited dedicated/i },
      { label: "Local Options Look Limited", pattern: /limited|larger areas|not local|not in|outside|few options/i },
      { label: "Not A Strong Recommendation", pattern: /not recommended|less relevant|not ideal|better option|instead|however/i },
      { label: "Pricing Or Value Concern", pattern: /expensive|costly|price|pricing|budget|value/i },
      { label: "Availability Is Unclear", pattern: /closed|unavailable|hours|booking|schedule|availability/i },
    ],
  };
  const definitions = definitionsBySentiment[sentiment] || [
    ...definitionsBySentiment.positive,
    ...definitionsBySentiment.neutral,
    ...definitionsBySentiment.negative,
  ];

  return definitions
    .map((definition) => {
      const matches = mentions.filter((result) => definition.pattern.test(result.answer || ""));
      return {
        label: definition.label,
        count: matches.length,
        summary: groundedSummaryForPattern(matches[0]?.answer || matches[0]?.context || "", definition.pattern, businessName || matches[0]?.businessName || ""),
      };
    })
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count);
}

function groundedSummaryForPattern(text, pattern, businessName = "") {
  const clean = String(text || "")
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/\bHowever,\s*I should note that\s*/gi, "")
    .replace(/\bHowever,\s*/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!clean) return "The answer did not provide enough wording to summarize this signal.";
  const boilerplate = /^(here are|based on|for the most current|would you like|is there a specific|my suggestion|note:|please note|i appreciate|i need to be straightforward|contact the|checking google|yelp|if you.d like)/i;
  const businessTokens = normalized(businessName).split(/\s+/).filter((token) => token.length > 3);
  const genericBusinessTokens = new Set(["hindu", "temple", "center", "centre", "church", "school", "clinic", "dental", "dentist", "foundation", "business", "services", "service"]);
  const distinctiveBusinessTokens = businessTokens.filter((token) => !genericBusinessTokens.has(token));
  const preferredBusinessTokens = distinctiveBusinessTokens.length ? distinctiveBusinessTokens : businessTokens;
  const sentences = (clean.match(/[^.!?]+[.!?]?/g) || [clean])
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 18 && !boilerplate.test(sentence));
  const ownSentence = businessTokens.length
    ? sentences.find((sentence) => preferredBusinessTokens.some((token) => normalized(sentence).includes(token)) && pattern.test(sentence))
    : null;
  const businessSentence = businessTokens.length
    ? sentences.find((sentence) => preferredBusinessTokens.some((token) => normalized(sentence).includes(token)))
    : null;
  const match = ownSentence || businessSentence || sentences.find((sentence) => pattern.test(sentence));
  return (match || sentences[0] || clean)
    .replace(/^[-•]\s*/, "")
    .trim();
}

function buildMentionContextTypes(mentions) {
  const definitions = [
    { label: "Premium Option", pattern: /premium|high-end|luxury|specialist|advanced|boutique|best for/i },
    { label: "Budget / Value Option", pattern: /budget|affordable|low cost|cheap|value|financing|insurance/i },
    { label: "Urgent Option", pattern: /urgent|emergency|same-day|open today|after-hours|immediate/i },
    { label: "Trusted Local Option", pattern: /trusted|reputable|reviews|local|community|established|experienced/i },
    { label: "Specialty Fit", pattern: /specializ|expert|focused|known for|good for|offers/i },
    { label: "Unclear Or Risky", pattern: /unclear|cannot verify|could not verify|limited information|negative|concern|mixed/i },
  ];

  return definitions.map((definition) => ({
    label: definition.label,
    value: mentions.filter((result) => definition.pattern.test(`${result.answer} ${result.context}`)).length,
  }));
}

function buildSentimentByCategory(mentions) {
  const map = new Map();
  for (const result of mentions) {
    const row = map.get(result.category) || { category: result.category, positive: 0, neutral: 0, negative: 0 };
    if (result.sentiment === "negative") row.negative += 1;
    else if (result.sentiment === "neutral") row.neutral += 1;
    else row.positive += 1;
    map.set(result.category, row);
  }
  return [...map.values()].slice(0, 8);
}

function conciseProblem(action) {
  const copy = cleanInsightCopy(action.problem || action.evidence || action.reason);
  return firstSentence(copy, 130);
}

function conciseSolution(action) {
  if (action.solution) return firstSentence(cleanInsightCopy(action.solution), 155);
  const title = `${action.title} ${action.reason}`.toLowerCase();
  if (/top|proof|recommendation/.test(title)) return "Add one concise proof section with ratings, reviews, and credentials.";
  if (/cost|price|value|afford|payment/.test(title)) return "Add a clear pricing or payment FAQ.";
  if (/availability|urgent|hours|booking|scheduling/.test(title)) return "Make hours, scheduling, and next steps easy to verify.";
  if (/local|area|location|near/.test(title)) return "Add a crawlable service-area section for nearby cities and neighborhoods.";
  if (/source|citation|cite|page|crawl/.test(title)) return "Create one crawlable page that directly answers the missing customer question.";
  if (/competitor/.test(title)) return "Add verifiable proof for the signal competitors are winning on.";
  return firstSentence(action.developerTasks?.[0] || action.reason, 120);
}

function cleanInsightCopy(value) {
  return String(value || "")
    .replace(/^AI framed the issue as:\s*/i, "AI said ")
    .replace(/^AI mentioned:\s*/i, "AI said ")
    .replace(/\bHowever,\s*I should note that\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function solutionTitle(action) {
  const title = `${action.title} ${action.solution || action.reason}`.toLowerCase();
  if (/limited|local options|menlo park/.test(title)) return "Add Menlo Park proof";
  if (/cannot verify|unclear|verify/.test(title)) return "Add verification FAQ";
  if (/citation|source|site/.test(title)) return "Create cited FAQ page";
  if (/competitor|gap/.test(title)) return "Match competitor proof";
  if (/program|service|visibility|topic/.test(title)) return "Add service proof";
  if (/local|area|location|near/.test(title)) return "Add local proof";
  return "Update target page";
}

function insightIcon(index) {
  const icons = [
    `<svg viewBox="0 0 24 24"><path d="M9 21h6v-2H9v2Zm3-20a7 7 0 0 0-4.4 12.4c.8.6 1.4 1.6 1.4 2.6h6c0-1 .5-1.9 1.4-2.6A7 7 0 0 0 12 1Zm2.9 10.8c-1.2.9-1.9 2.1-2.1 3.2h-1.6c-.2-1.1-.9-2.3-2.1-3.2A4.6 4.6 0 0 1 7.4 8 4.6 4.6 0 0 1 12 3.4 4.6 4.6 0 0 1 16.6 8c0 1.5-.6 2.9-1.7 3.8Z" /></svg>`,
    `<svg viewBox="0 0 24 24"><path d="m12 2 1.6 5.4L19 9l-5.4 1.6L12 16l-1.6-5.4L5 9l5.4-1.6L12 2Zm7 11 1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3Z" /></svg>`,
    `<svg viewBox="0 0 24 24"><path d="M4 7h16v12H4V7Zm2 2v8h12V9H6Zm3-6h6l1 2H8l1-2Z" /></svg>`,
  ];
  return icons[index % icons.length];
}

function getGroundedActions(scan) {
  if (!scan?.metrics?.completedAnswers) return [];
  const base = scan.metrics.actions || [];
  const derived = deriveGroundedActions(scan);
  const seen = new Set();
  return [...derived, ...base]
    .filter((action) => {
      const key = `${action.title}|${action.reason}`.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 5);
}

function deriveGroundedActions(scan) {
  const results = scan.results || [];
  const metrics = scan.metrics || {};
  const ownMentions = results.filter((result) => result.ownMentioned);
  const actions = [];
  const uncertain = ownMentions.find((result) => /unclear|cannot verify|could not verify|limited information|not enough/i.test(`${result.answer} ${result.context}`));
  const negative = ownMentions.find((result) => result.sentiment === "negative");
  const weakCategory = (metrics.categoryScores || [])
    .filter((category) => category.attempts > 0)
    .sort((a, b) => a.mentionRate - b.mentionRate)[0];
  const topCompetitor = (metrics.competitors || [])[0];
  const ownCitationCount = metrics.sources?.ownCitationCount || 0;
  const totalCitationCount = metrics.sources?.totalCitationCount || 0;
  const topExternalSource = (metrics.sources?.topSources || []).find((source) => source.host && !sameHost(source.host, scan.website));

  if (negative) {
    const issue = groundedSummaryForPattern(negative.answer || negative.context, /expensive|unclear|cannot verify|could not verify|limited|closed|not recommended|negative|concern|mixed/i);
    const target = pageTargetForResult(negative);
    actions.push({
      title: "AI says local options are limited",
      impact: "High impact",
      reason: `AI described the business negatively for "${negative.prompt}".`,
      evidence: issue,
      problem: `AI framed the issue as: ${issue}`,
      solution: `Add a ${target} proof block: services offered, who it serves, and 2-3 Menlo Park examples.`,
      developerTasks: [`Update the ${target} with a concise section that addresses: ${issue}`],
    });
  }

  if (uncertain) {
    const issue = groundedSummaryForPattern(uncertain.answer || uncertain.context, /unclear|cannot verify|could not verify|limited information|not enough/i);
    const target = pageTargetForResult(uncertain);
    actions.push({
      title: "AI cannot verify details",
      impact: "High impact",
      reason: `AI showed uncertainty for "${uncertain.prompt}".`,
      evidence: issue,
      problem: `AI could not verify this clearly: ${issue}`,
      solution: `Add a ${target} FAQ for "${uncertain.prompt}" with hours, eligibility, contact, and next steps in plain text.`,
      developerTasks: [`Add crawlable verification details to the ${target}.`],
    });
  }

  if (totalCitationCount && ownCitationCount / totalCitationCount < 0.35 && topExternalSource) {
    actions.push({
      title: "Improve own-site citation coverage",
      impact: "High impact",
      reason: `AI relied more on ${topExternalSource.host} than your website for supporting information.`,
      evidence: `${ownCitationCount} of ${totalCitationCount} tracked citations pointed to your site.`,
      problem: `Only ${ownCitationCount} of ${totalCitationCount} tracked citations pointed to your own site.`,
      solution: `Create an own-site FAQ that answers the prompt themes currently supported by ${topExternalSource.host}.`,
      developerTasks: ["Create a focused, crawlable page that directly answers the prompt themes currently being sourced elsewhere."],
    });
  }

  if (topCompetitor?.mentionRate > metrics.mentionRate) {
    actions.push({
      title: `Close the gap with ${topCompetitor.name}`,
      impact: "Medium impact",
      reason: `${topCompetitor.name} appears more often in AI answers.`,
      evidence: `${topCompetitor.name} mention rate is ${topCompetitor.mentionRate}% vs. ${metrics.mentionRate}% for this business.`,
      problem: `${topCompetitor.name} is showing up more often than you in completed answers.`,
      solution: `Add reviews, credentials, and location proof for the topic where ${topCompetitor.name} is winning.`,
      developerTasks: ["Add verifiable proof points for the categories where this competitor appears most often."],
    });
  }

  if (weakCategory && weakCategory.mentionRate < 35) {
    actions.push({
      title: `Strengthen ${weakCategory.label.toLowerCase()} visibility`,
      impact: "High impact",
      reason: `AI rarely mentions the business for ${weakCategory.label.toLowerCase()} prompts.`,
      evidence: `${weakCategory.label} mention rate is ${weakCategory.mentionRate}% across ${weakCategory.attempts} answer${weakCategory.attempts === 1 ? "" : "s"}.`,
      problem: `${weakCategory.label} visibility is low at ${weakCategory.mentionRate}%.`,
      solution: `Add a ${weakCategory.label.toLowerCase()} section with customer wording, proof, local details, and next steps.`,
      developerTasks: ["Add a concise page section that answers this topic in customer wording with proof and next steps."],
    });
  }

  return actions;
}

function pageTargetForResult(result) {
  const text = `${result?.category || ""} ${result?.prompt || ""}`.toLowerCase();
  if (/temple|pooja|puja|aarthi|aarti|darshan|devotee|hindu|religious/.test(text)) return "Temple Services / Pooja Page";
  if (/sports|athlete|youth sports/.test(text)) return "Youth Sports Program Details Page";
  if (/family|program|service|class/.test(text)) return "Service Details Page";
  if (/cost|price|value|afford|payment/.test(text)) return "Pricing Or Value Page";
  if (/availability|urgent|scheduling|booking|hours/.test(text)) return "Availability Or Scheduling Page";
  if (/local|near|location/.test(text)) return "Location / Service Area Page";
  if (/trust|proof|top|recommendation/.test(text)) return "Proof / Recommendations Page";
  return "Relevant Service Page";
}

function sameHost(hostOrUrl, website) {
  try {
    const left = hostOrUrl.includes("://") ? new URL(hostOrUrl).hostname : hostOrUrl;
    const right = new URL(website).hostname;
    return left.replace(/^www\./, "") === right.replace(/^www\./, "");
  } catch {
    return false;
  }
}

function firstSentence(value, maxLength = 140) {
  const sentence = String(value || "")
    .split(/(?<=[.!?])\s+/)[0]
    .trim();
  if (sentence.length <= maxLength) return sentence;
  return `${sentence.slice(0, maxLength - 1).trim()}...`;
}

function titleCaseLabel(value) {
  return String(value || "")
    .split(/(\s+|\/|-)/)
    .map((part) => {
      if (/^\s+$|^\/$|^-$/.test(part)) return part;
      const lower = part.toLowerCase();
      if (["ai", "llm", "geo", "crm"].includes(lower)) return lower.toUpperCase();
      return lower ? lower[0].toUpperCase() + lower.slice(1) : lower;
    })
    .join("");
}

function renderEvidence() {
  if (!els.evidenceRows) return;
  const results = state.currentScan?.results || [];
  els.evidenceRows.innerHTML = results.length
    ? results
        .map(
          (result) => `
            <tr>
              <td><button class="text-button" type="button" data-result="${result.id}">${escapeHtml(result.prompt)}</button></td>
              <td>${escapeHtml(result.platformLabel)}<br /><small>${escapeHtml(result.model || "")}</small></td>
              <td>${formatDate(result.requestedAt)}</td>
              <td>${escapeHtml(result.location)}</td>
              <td>${result.rank ? `#${result.rank}` : "-"}</td>
              <td><span class="tag ${result.sentiment === "negative" ? "negative" : result.sentiment === "not mentioned" ? "warning" : ""}">${escapeHtml(result.sentiment)}</span></td>
              <td>${result.error ? `<span class="error-text">${escapeHtml(result.error)}</span>` : `${result.sources?.length || 0} source${result.sources?.length === 1 ? "" : "s"}`}</td>
            </tr>
          `,
        )
        .join("")
    : `<tr><td colspan="7">No evidence records yet.</td></tr>`;

  els.evidenceRows.querySelectorAll("button[data-result]").forEach((button) => {
    button.addEventListener("click", () => showAnswer(button.dataset.result));
  });
}

function renderTrend() {
  const current = state.currentScan;
  const allScoredScans = state.scans.filter((scan) => isComparableScan(scan, current) && Number.isFinite(scan.metrics?.visibilityScore));
  const scanTimes = allScoredScans.map((scan) => new Date(scan.createdAt).getTime());
  const firstTime = Math.min(...scanTimes, Date.now());
  const latestTime = Math.max(...scanTimes, Date.now());
  const rangeDays = Number(state.trendRangeDays) || 7;
  const rangeMs = rangeDays * 24 * 60 * 60 * 1000;
  const isEarlyRange = latestTime - firstTime < rangeMs;
  const rangeStart = isEarlyRange ? firstTime : latestTime - rangeMs;
  const rangeEnd = isEarlyRange ? firstTime + rangeMs : latestTime;
  const scoredScans = allScoredScans
    .filter((scan) => new Date(scan.createdAt).getTime() >= rangeStart && new Date(scan.createdAt).getTime() <= rangeEnd)
    .slice(-12);
  if (!scoredScans.length) {
    els.trendChart.innerHTML = `<text x="24" y="112">No trend yet. Run a scan to start tracking.</text>`;
    if (els.trendLabel) els.trendLabel.textContent = "";
    return;
  }

  const width = 760;
  const height = 280;
  const pad = { top: 38, right: 20, bottom: 40, left: 54 };
  const rangeWidth = Math.max(1, rangeEnd - rangeStart);
  const points = scoredScans.map((scan) => {
    const time = new Date(scan.createdAt).getTime();
    const x = pad.left + ((time - rangeStart) / rangeWidth) * (width - pad.left - pad.right);
    const y = height - pad.bottom - (scan.metrics.visibilityScore / 100) * (height - pad.top - pad.bottom);
    return { x, y, scan };
  });

  const line = smoothPath(points);
  if (els.trendLabel) els.trendLabel.textContent = "";
  const baseY = height - pad.bottom;
  const area = `${line} L ${points.at(-1).x} ${baseY} L ${points[0].x} ${baseY} Z`;
  const startDate = new Date(rangeStart);
  const midDate = new Date(rangeStart + rangeWidth / 2);
  const endDate = new Date(rangeEnd);
  const gridRows = [100, 75, 50, 25, 0].map((value) => {
    const y = pad.top + ((100 - value) / 100) * (height - pad.top - pad.bottom);
    return `
      <line class="grid" x1="${pad.left}" y1="${y}" x2="${width - pad.right}" y2="${y}"></line>
      <text class="y-label" x="22" y="${y + 4}">${value}</text>
    `;
  }).join("");
  els.trendChart.innerHTML = `
    <defs>
      <linearGradient id="trendAreaGradient" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stop-color="#5146f5" stop-opacity="0.18"></stop>
        <stop offset="100%" stop-color="#5146f5" stop-opacity="0.02"></stop>
      </linearGradient>
    </defs>
    ${gridRows}
    <path class="area" d="${area}"></path>
    <path class="line" d="${line}"></path>
    ${points.map((point) => `<circle class="dot" cx="${point.x}" cy="${point.y}" r="5"></circle>`).join("")}
    <text class="x-label" x="${pad.left}" y="${height - 7}">${formatShortDate(startDate)}</text>
    <text class="x-label" x="${width / 2}" y="${height - 7}" text-anchor="middle">${formatShortDate(midDate)}</text>
    <text class="x-label" x="${width - pad.right}" y="${height - 7}" text-anchor="end">${formatShortDate(endDate)}</text>
  `;
}

function isComparableScan(scan, current) {
  if (!scan || !current) return false;
  const scanHost = hostnameFor(scan.website || scan.hostname || "");
  const currentHost = hostnameFor(current.website || current.hostname || "");
  if (scanHost && currentHost) return scanHost === currentHost;
  return normalized(scan.businessName) === normalized(current.businessName);
}

function hostnameFor(value) {
  try {
    const host = value.includes("://") ? new URL(value).hostname : value;
    return host.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

function smoothPath(points) {
  if (!points.length) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  return points
    .map((point, index) => {
      if (index === 0) return `M ${point.x} ${point.y}`;
      const previous = points[index - 1];
      const control = Math.max(18, Math.min(72, (point.x - previous.x) * 0.42));
      return `C ${previous.x + control} ${previous.y}, ${point.x - control} ${point.y}, ${point.x} ${point.y}`;
    })
    .join(" ");
}

function renderBarList(container, rows = [], labelKey, valueKey) {
  if (!rows.length) {
    container.innerHTML = `<div class="stack-item"><p>No citations yet.</p></div>`;
    return;
  }

  const max = Math.max(...rows.map((row) => row[valueKey]), 1);
  container.innerHTML = rows
    .slice(0, 5)
    .map(
      (row) => `
        <div class="bar-item">
          <span title="${escapeAttr(row[labelKey])}">${escapeHtml(row[labelKey])}</span>
          <strong>${row[valueKey]}</strong>
          <div class="bar-track"><i style="--w:${Math.max(8, (row[valueKey] / max) * 100)}%"></i></div>
        </div>
      `,
    )
    .join("");
}

function renderEmptyLists() {
  els.platformPills.innerHTML = "";
  if (els.categoryList) els.categoryList.innerHTML = emptyStack("No intent data yet.");
  if (els.overviewCompetitorList) els.overviewCompetitorList.innerHTML = emptyStack("Competitor share appears after completed AI answers.");
  if (els.factorList) els.factorList.innerHTML = emptyStack("Run a scan to learn why AI systems mention or skip the business.");
  if (els.sourceList) els.sourceList.innerHTML = emptyStack("No sources yet.");
  if (els.pageList) els.pageList.innerHTML = emptyStack("No cited pages yet.");
  renderActions([]);
}

function showAnswer(resultId) {
  const result = state.currentScan?.results.find((item) => item.id === resultId);
  if (!result) return;

  els.dialogContent.innerHTML = `
    <p class="eyebrow">${escapeHtml(result.platformLabel)} result</p>
    <h2>${escapeHtml(result.prompt)}</h2>
    <p><strong>Date/time:</strong> ${formatDate(result.requestedAt)} | <strong>Location:</strong> ${escapeHtml(result.location)} | <strong>Rank:</strong> ${result.rank ? `#${result.rank}` : "Not mentioned"}</p>
    <p><strong>Sentiment:</strong> ${escapeHtml(result.sentiment)} | <strong>Context:</strong> ${escapeHtml(result.context)}</p>
    <h3>Full answer</h3>
    <div class="answer-block">${escapeHtml(result.answer || result.error || "No answer returned.")}</div>
    <h3>Sources</h3>
    ${
      result.citations?.length
        ? `<ul>${result.citations.map((source) => `<li><a href="${escapeAttr(source)}" target="_blank" rel="noreferrer">${escapeHtml(source)}</a></li>`).join("")}</ul>`
        : "<p>No citations returned by this provider.</p>"
    }
    <h3>Mentioned businesses</h3>
    <p>${result.businesses?.length ? result.businesses.map(escapeHtml).join(", ") : "No business list could be parsed from the answer."}</p>
  `;
  els.answerDialog.showModal();
}

function setScanning(isScanning) {
  state.isScanning = isScanning;
  if (isScanning) {
    state.scanStartedAt = Date.now();
    if (els.statusStrip) {
      els.statusStrip.hidden = false;
      els.statusText.textContent = "Scanning the site, inferring location, generating prompts, and checking AI answers. This can take a few minutes.";
      els.statusStrip.classList.remove("ready", "error");
    }
    clearTimeout(state.longScanTimer);
    state.longScanTimer = setTimeout(() => {
      const configured = state.config ? Object.values(state.config.providers).filter((provider) => provider.configured).length : 0;
      const promptCount = state.config?.limits?.maxScanPrompts || 12;
      const estimate = Math.max(2, Math.ceil((promptCount * Math.max(configured, 1) * 8) / 60));
      setStatus(`Still scanning. This can take about ${estimate} minutes for a full site scan. You can keep working in the meantime.`, "working");
    }, 60000);
  } else {
    clearTimeout(state.longScanTimer);
    state.longScanTimer = null;
  }
  renderSetupVisibility();
  els.runButton.disabled = isScanning;
  els.runButton.innerHTML = isScanning
    ? `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2v4a6 6 0 1 1-6 6H2a10 10 0 1 0 10-10Z" /></svg>Scanning`
    : `Start Scan`;
  els.propertyBar?.classList.toggle("is-scanning", isScanning);
}

function setStatus(text, type = "working") {
  els.statusStrip.hidden = false;
  els.statusText.textContent = text;
  els.statusStrip.classList.toggle("ready", type === "ready");
  els.statusStrip.classList.toggle("error", type === "error");
}

function setDeveloperButtonsVisible(isVisible) {
  [els.developerEmailButton, els.actionEmailButton].filter(Boolean).forEach((button) => {
    button.hidden = !isVisible;
  });
}

function buildDeveloperMailto(scan, selectedActions = getGroundedActions(scan)) {
  const metrics = scan.metrics;
  const subject = `AI visibility fix for ${scan.businessName}`;
  const categoryLines = metrics.categoryScores
    .slice(0, 6)
    .map((category) => `- ${category.label}: ${category.mentionRate}% mention rate${category.avgRank ? `, avg. rank #${category.avgRank}` : ""}`)
    .join("\n");
  const actionLines = selectedActions
    .map((action, index) => {
      const tasks = (action.developerTasks || []).map((task) => `   - ${task}`).join("\n");
      return `${index + 1}. ${action.title} (${action.impact})\n   Why: ${action.reason}${action.evidence ? `\n   Evidence: ${action.evidence}` : ""}${tasks ? `\n${tasks}` : ""}`;
    })
    .join("\n\n");
  const competitorLines = (metrics.competitors || [])
    .slice(0, 3)
    .map((competitor) => `- ${competitor.name}: ${competitor.mentionRate}% mention rate${competitor.avgRank ? `, avg. rank #${competitor.avgRank}` : ""}`)
    .join("\n");
  const trendLine = metrics.trend?.previousScanId
    ? `Since the previous scan, score changed ${formatDelta(metrics.trend.visibilityScoreDelta)} and mention rate changed ${formatDelta(metrics.trend.mentionRateDelta, "%")}.`
    : "This is the first comparable scan, so future scans will measure lift after changes.";

  const body = [
    `Hi Krish,`,
    ``,
    `Please improve ${scan.businessName}'s website for AI visibility.`,
    ``,
    `Website: ${scan.website}`,
    `Location tested: ${scan.location}`,
    `AI visibility score: ${valueOrDash(metrics.visibilityScore)}/100`,
    `Mention rate: ${metrics.mentionRate}%`,
    `Average position when mentioned: ${metrics.avgRank ? `#${metrics.avgRank}` : "not ranked yet"}`,
    trendLine,
    ``,
    `Priority fixes:`,
    actionLines || "- No action items were generated.",
    ``,
    `Intent performance:`,
    categoryLines || "- No category data yet.",
    ``,
    `Competitors showing up in the same AI answers:`,
    competitorLines || "- No competitors detected yet.",
    ``,
    `Goal: make these facts easier for AI systems to verify through crawlable service, FAQ, location, pricing, hours, and proof pages.`,
  ].join("\n");

  return `mailto:krish.s.grover@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function providerLabel(key) {
  return state.config?.providers?.[key]?.label || key;
}

function emptyCard(title, body) {
  return `<article class="prompt-card"><strong>${escapeHtml(title)}</strong><p>${escapeHtml(body)}</p></article>`;
}

function emptyStack(body) {
  return `<article class="stack-item"><p>${escapeHtml(body)}</p></article>`;
}

function factorIcon(kind) {
  return kind === "warning"
    ? `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M1 21h22L12 2 1 21Zm12-3h-2v-2h2v2Zm0-4h-2v-4h2v4Z" /></svg>`
    : `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m10 15.2 7.4-7.4 1.4 1.4L10 18 5.2 13.2l1.4-1.4L10 15.2Z" /></svg>`;
}

function summarizeContexts(results) {
  const mentioned = results.filter((result) => result.ownMentioned);
  if (!mentioned.length) return "The business was not mentioned in completed answers.";
  const contexts = [...new Set(mentioned.map((result) => result.context))].slice(0, 2);
  return contexts.join(" ");
}

async function fetchJson(url) {
  const response = await fetch(url);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Request failed.");
  return data;
}

function percent(part, total) {
  return total ? Math.round((part / total) * 100) : 0;
}

function valueOrDash(value) {
  return value === null || value === undefined ? "-" : value;
}

function initialsFor(name) {
  return String(name || "")
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function normalized(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function sameBusinessName(a, b) {
  const rawClean = (value) =>
    String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  const clean = (value) =>
    rawClean(value)
      .replace(/\b(llc|inc|co|company|group|studio|practice|foundation|clinic|center|centre)\b/g, "")
      .trim();
  const acronym = (value) =>
    rawClean(value)
      .split(/\s+/)
      .filter((part) => part && !["llc", "inc", "co", "company", "group", "studio", "practice", "foundation", "clinic", "center", "centre"].includes(part))
      .map((part) => part[0])
      .join("");
  const left = clean(a);
  const right = clean(b);
  const leftAcronym = acronym(a);
  const rightAcronym = acronym(b);
  return Boolean(
    left &&
      right &&
      (left === right ||
        left.includes(right) ||
        right.includes(left) ||
        (left.length <= 5 && left === rightAcronym) ||
        (right.length <= 5 && right === leftAcronym)),
  );
}

function formatDelta(value, suffix = "") {
  if (!Number.isFinite(value)) return "no measured change";
  if (value === 0) return `+0${suffix}`;
  return `${value > 0 ? "+" : ""}${value}${suffix}`;
}

function formatDate(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatShortDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(value));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, "&#096;");
}
