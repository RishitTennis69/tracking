import http from "node:http";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "data");
const SCANS_FILE = path.join(DATA_DIR, "scans.json");

loadDotEnv();

const PORT = Number(process.env.PORT || 4173);
const MAX_CRAWL_PAGES = clamp(Number(process.env.MAX_CRAWL_PAGES || 8), 1, 16);
const MAX_SCAN_PROMPTS = clamp(Number(process.env.MAX_SCAN_PROMPTS || 18), 1, 18);

const PROVIDERS = {
  openai: {
    label: "ChatGPT",
    keyName: "OPENAI_API_KEY",
    model: process.env.OPENAI_MODEL || "gpt-5-nano",
  },
  gemini: {
    label: "Gemini",
    keyName: "GEMINI_API_KEY",
    model: process.env.GEMINI_MODEL || "gemini-3.1-flash-lite",
  },
  openrouter: {
    label: "Claude",
    keyName: "OPENROUTER_API_KEY",
    model: process.env.OPENROUTER_MODEL || "anthropic/claude-haiku-4.5",
  },
};

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
};

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host}`);

    if (url.pathname === "/api/config" && request.method === "GET") {
      return sendJson(response, await getConfig());
    }

    if (url.pathname === "/api/scans" && request.method === "GET") {
      return sendJson(response, { scans: await readScans() });
    }

    if (url.pathname === "/api/scans/latest" && request.method === "GET") {
      const scans = await readScans();
      return sendJson(response, { scan: scans.at(-1) || null });
    }

    if (url.pathname === "/api/scan" && request.method === "POST") {
      const payload = await readJsonBody(request);
      const scans = await readScans();
      const scan = await runScan(payload, scans);
      scans.push(scan);
      await writeScans(scans.slice(-50));
      return sendJson(response, { scan });
    }

    return serveStatic(url.pathname, response);
  } catch (error) {
    console.error(error);
    return sendJson(
      response,
      {
        error: error.message || "Something went wrong while running the scan.",
      },
      500,
    );
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Gleo GEO Insights running at http://127.0.0.1:${PORT}/`);
});

async function runScan(payload, previousScans = []) {
  const website = normalizeUrl(payload.website);
  const selectedPlatforms = normalizePlatforms(payload.platforms);
  const businessName = cleanText(payload.businessName || "") || inferNameFromUrl(website);
  const submittedLocation = cleanText(payload.location || "");
  const configuredPlatforms = selectedPlatforms.filter((platform) => isProviderConfigured(platform));
  const startedAt = new Date().toISOString();
  const crawledSite = await crawlSite(website);
  const site = await enrichSiteWithAIProfile({ site: crawledSite, businessName, location: submittedLocation || "United States" });
  const location = submittedLocation || firstMeaningfulArea(site.searchAreas) || site.detectedLocations?.[0] || "United States";
  site.searchAreas = buildSearchAreas(location, [...(site.searchAreas || []), ...(site.detectedLocations || [])]);
  const prompts = buildPromptSet({ site, businessName, location }).slice(0, MAX_SCAN_PROMPTS);
  const promptStrategy = buildPromptStrategy({ site, prompts, businessName, location });

  const results = [];

  for (const prompt of prompts) {
    for (const platform of configuredPlatforms) {
      const started = new Date().toISOString();
      try {
      const providerResult = await askProvider(platform, {
        prompt: prompt.text,
        businessName,
        location,
        site,
      });
      if (!cleanText(providerResult.answer || "")) {
        const incompleteReason = providerResult.rawMeta?.incomplete?.reason;
        throw new Error(
          incompleteReason
            ? `${PROVIDERS[platform].label} returned no answer text (${incompleteReason}).`
            : `${PROVIDERS[platform].label} returned no answer text.`,
        );
      }
      results.push(
        analyzeAnswer({
            ...providerResult,
            id: makeId(),
            promptId: prompt.id,
            prompt: prompt.text,
            category: prompt.category,
            platform,
            platformLabel: PROVIDERS[platform].label,
            model: PROVIDERS[platform].model,
            requestedAt: started,
            location,
            businessName,
            website,
          }),
        );
      } catch (error) {
        results.push({
          id: makeId(),
          promptId: prompt.id,
          prompt: prompt.text,
          category: prompt.category,
          platform,
          platformLabel: PROVIDERS[platform].label,
          model: PROVIDERS[platform].model,
          requestedAt: started,
          location,
          answer: "",
          citations: [],
          sources: [],
          businesses: [],
          ownMentioned: false,
          rank: null,
          sentiment: "unknown",
          context: "The provider call failed.",
          error: error.message || "Provider call failed.",
        });
      }
    }
  }

  const metrics = buildMetrics({ results, prompts, site, businessName, website, previousScans });

  return {
    id: makeId(),
    createdAt: startedAt,
    website,
    hostname: new URL(website).hostname,
    businessName,
    location,
    requestedPlatforms: selectedPlatforms,
    configuredPlatforms,
    missingPlatforms: selectedPlatforms.filter((platform) => !isProviderConfigured(platform)),
    site,
    promptStrategy,
    prompts,
    results,
    metrics,
  };
}

async function crawlSite(startUrl) {
  const origin = new URL(startUrl).origin;
  const visited = new Set();
  const pages = [];
  const queue = [startUrl];

  while (queue.length && pages.length < MAX_CRAWL_PAGES) {
    const url = queue.shift();
    if (!url || visited.has(url)) continue;
    visited.add(url);

    try {
      const html = await fetchText(url, 14000);
      const page = extractPage(url, html);
      if (page.text.length < 120 && pages.length > 0) continue;
      pages.push(page);

      const links = extractLinks(url, html)
        .filter((link) => link.startsWith(origin))
        .filter((link) => !visited.has(link))
        .filter(isLikelyContentPage)
        .sort((a, b) => linkScore(b) - linkScore(a));

      for (const link of links) {
        if (!queue.includes(link) && queue.length < MAX_CRAWL_PAGES * 3) queue.push(link);
      }
    } catch (error) {
      if (pages.length === 0) {
        throw new Error(`Could not fetch ${url}: ${error.message}`);
      }
    }
  }

  const text = pages.map((page) => `${page.title} ${page.description} ${page.headings.join(" ")} ${page.text}`).join(" ");
  const keywords = extractKeywords(text);
  const vertical = inferVertical(text, startUrl);
  const services = inferServices(text, vertical);
  const detectedLocations = inferLocations(text);

  return {
    startUrl,
    pages,
    pageCount: pages.length,
    keywords,
    vertical,
    services,
    detectedLocations,
    crawledAt: new Date().toISOString(),
  };
}

function extractPage(url, html) {
  const withoutScripts = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ");

  const title = decodeEntities(matchFirst(withoutScripts, /<title[^>]*>([\s\S]*?)<\/title>/i));
  const description = decodeEntities(
    matchFirst(withoutScripts, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["'][^>]*>/i) ||
      matchFirst(withoutScripts, /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["'][^>]*>/i),
  );
  const headings = [...withoutScripts.matchAll(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi)]
    .map((match) => cleanText(stripTags(match[1])))
    .filter(Boolean)
    .slice(0, 14);

  const text = cleanText(decodeEntities(stripTags(withoutScripts))).slice(0, 8500);

  return {
    url,
    title: cleanText(title),
    description: cleanText(description),
    headings,
    text,
    wordCount: text.split(/\s+/).filter(Boolean).length,
  };
}

function extractLinks(baseUrl, html) {
  return [...html.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>/gi)]
    .map((match) => {
      try {
        const url = new URL(match[1], baseUrl);
        url.hash = "";
        url.search = "";
        return url.toString().replace(/\/$/, "");
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function isLikelyContentPage(url) {
  const lower = url.toLowerCase();
  if (/\.(jpg|jpeg|png|gif|webp|svg|pdf|zip|mp4|mov|css|js)$/i.test(lower)) return false;
  if (/(facebook|instagram|linkedin|twitter|x\.com|youtube|mailto:|tel:)/i.test(lower)) return false;
  return true;
}

function linkScore(url) {
  const lower = url.toLowerCase();
  let score = 0;
  for (const token of ["service", "about", "faq", "contact", "location", "pricing", "emergency", "reviews", "new-patient"]) {
    if (lower.includes(token)) score += 5;
  }
  return score - lower.length / 100;
}

async function enrichSiteWithAIProfile({ site, businessName, location }) {
  const searchAreas = buildSearchAreas(location, site.detectedLocations);
  const fallback = {
    ...site,
    searchAreas,
    aiProfile: null,
    aiPromptGroups: null,
  };

  if (!isProviderConfigured("openai")) return fallback;

  const pageDigest = site.pages
    .slice(0, 6)
    .map((page) => {
      const title = page.title || new URL(page.url).pathname || "Page";
      const headings = page.headings.slice(0, 6).join("; ");
      const text = page.text.slice(0, 1200);
      return `URL: ${page.url}\nTitle: ${title}\nDescription: ${page.description}\nHeadings: ${headings}\nText: ${text}`;
    })
    .join("\n\n---\n\n");

  const systemPrompt = [
    "Analyze the crawled website for GEO/AI visibility tracking.",
    "Return JSON only. Do not wrap it in markdown.",
    "Infer the actual business category from the page content. Do not rely on a fixed vertical list.",
    "Create realistic customer prompts for AI visibility checks. Prompts must match the business, not a prior example.",
    "Use a mix of the exact city, nearby cities/service areas, and broader regional wording when it makes sense.",
    "Each prompt group should contain three prompts that test the same user intent with local/regional wording variation.",
  ].join(" ");

  const userPrompt = {
    businessName,
    submittedLocation: location,
    suggestedSearchAreas: searchAreas,
    heuristicProfile: {
      vertical: site.vertical,
      services: site.services,
      keywords: site.keywords.slice(0, 12),
      detectedLocations: site.detectedLocations,
    },
    expectedJsonShape: {
      vertical: {
        label: "short industry/category, e.g. Hindu temple, pediatric dentist, acupuncture clinic",
        specialty: "primary service phrase",
        customer: "real customer/devotee/patient/user group",
        urgent: false,
        priceLanguage: "natural cost/value/donation prompt phrase using a local area",
      },
      services: ["3 to 6 concrete services from the site"],
      customerTypes: ["2 to 5 audience/customer groups"],
      searchAreas: ["exact city", "nearby city or neighborhood", "broader region"],
      promptGroups: [
        {
          category: "Business-specific category name",
          prompts: ["same intent prompt 1", "same intent prompt 2", "same intent prompt 3"],
          intent: "what this measures",
          reason: "why this matters",
        },
      ],
    },
    pageDigest,
  };

  try {
    const data = await postJson(
      "https://api.openai.com/v1/responses",
      {
        model: PROVIDERS.openai.model,
        input: `${systemPrompt}\n\n${JSON.stringify(userPrompt, null, 2)}`,
        max_output_tokens: 1800,
        reasoning: { effort: "minimal" },
      },
      { Authorization: `Bearer ${process.env[PROVIDERS.openai.keyName]}` },
    );
    const profile = parseJsonObject(extractOpenAIText(data));
    const vertical = normalizeAIVertical(profile?.vertical, site.vertical);
    const services = normalizeAIList(profile?.services, site.services).slice(0, 6);
    const aiSearchAreas = normalizeAIList(profile?.searchAreas, searchAreas);
    const mergedSearchAreas = buildSearchAreas(location, [...aiSearchAreas, ...site.detectedLocations]);
    const aiPromptGroups = normalizeAIPromptGroups(profile?.promptGroups, mergedSearchAreas, location);

    return {
      ...site,
      vertical,
      services: services.length ? services : site.services,
      searchAreas: mergedSearchAreas,
      aiProfile: {
        customerTypes: normalizeAIList(profile?.customerTypes, [vertical.customer]).slice(0, 5),
        generatedAt: new Date().toISOString(),
      },
      aiPromptGroups: aiPromptGroups.length ? aiPromptGroups : null,
    };
  } catch (error) {
    console.warn(`AI site analysis failed; using heuristic profile: ${error.message}`);
    return fallback;
  }
}

function buildPromptSet({ site, businessName, location }) {
  if (Array.isArray(site.aiPromptGroups) && site.aiPromptGroups.length) {
    return site.aiPromptGroups.flatMap((group) => {
      const prompts = Array.isArray(group.prompts) && group.prompts.length ? group.prompts : [group.prompt].filter(Boolean);
      const repeatedPrompt = cleanText(prompts[0] || group.prompt || "");
      return repeatPrompt(repeatedPrompt, 3).map((text, index) => ({
        id: makeId(),
        category: cleanText(group.category || "AI visibility"),
        text,
        runIndex: index + 1,
        intent: cleanText(group.intent || "Measure AI visibility for a realistic customer query."),
        locationVariant: inferPromptLocation(text, site.searchAreas, location),
        reason: cleanText(group.reason || "Generated from the site crawl and business profile."),
        businessName,
        generatedFrom: "AI site analysis",
      }));
    });
  }

  const vertical = site.vertical.label;
  const service = site.services[0] || site.vertical.specialty || vertical;
  const searchAreas = site.searchAreas?.length ? site.searchAreas : buildSearchAreas(location, site.detectedLocations);
  const nearby = searchAreas[0] || location;
  const secondaryLocation = searchAreas.find((item) => item !== nearby) || searchAreas[1] || "near me";
  const secondaryNearPhrase = secondaryLocation === "near me" ? "near me" : `near ${secondaryLocation}`;
  const regionalLocation = searchAreas.find((item) => /area|county|valley|bay/i.test(item)) || secondaryLocation;
  const customer = site.vertical.customer || "customers";
  const specialty = site.services[1] || service;
  const thirdService = site.services[2] || specialty;
  const availabilityPhrase = site.vertical.urgent
    ? `urgent ${service} near me open today in ${location}`
    : `${service} available for ${customer} in ${location}`;
  const availabilityCategory = site.vertical.urgent ? "Urgent availability" : "Availability / scheduling";
  const pricePhrase = (site.vertical.priceLanguage || `cost of ${service} near ${location}`).replace(/\bnear me\b/i, `near ${location}`);
  const topicGroups = [
    {
      category: `Top ${vertical} recommendations`,
      prompts: [
        `best ${vertical} in ${location}`,
        `best ${vertical} near ${secondaryLocation}`,
        `best ${vertical} in the ${regionalLocation}`,
      ],
      intent: "Find the most recommended provider",
      reason: `Tests whether AI systems include the business when customers ask for the best ${vertical} nearby.`,
    },
    {
      category: "Cost / value",
      prompts: [
        pricePhrase,
        pricePhrase,
        pricePhrase,
      ],
      intent: "Compare price and payment confidence",
      reason: "Checks whether price, eligibility, payment, or value signals are clear enough to be recommended.",
    },
    {
      category: availabilityCategory,
      prompts: [
        availabilityPhrase,
        availabilityPhrase,
        availabilityPhrase,
      ],
      intent: site.vertical.urgent ? "Find immediate availability" : "Find availability or next steps",
      reason: site.vertical.urgent
        ? "Looks for verified same-day, emergency, after-hours, or open-today availability."
        : "Looks for clear scheduling, enrollment, booking, eligibility, or contact information.",
    },
    {
      category: "Trust / proof",
      prompts: [
        `trusted ${vertical} for ${customer} near ${location}`,
        `trusted ${vertical} for ${customer} near ${secondaryLocation}`,
        `trusted ${vertical} for ${customer} in the ${regionalLocation}`,
      ],
      intent: "Evaluate trust for a careful buyer",
      reason: "Tests reviews, credentials, proof points, and customer-fit claims.",
    },
    {
      category: `${capitalizeWords(service)} visibility`,
      prompts: [
        `best ${service} near ${location}`,
        `best ${service} near ${secondaryLocation}`,
        `best ${service} in the ${regionalLocation}`,
      ],
      intent: `Find a specific ${service} option`,
      reason: `Checks whether the business is associated with its most important ${service} searches.`,
    },
    {
      category: "Local discovery",
      prompts: [
        `${vertical} near ${nearby} that ${customer} recommend`,
        `${vertical} near ${secondaryNearPhrase.replace(/^near /, "")} that ${customer} recommend`,
        `${vertical} in the ${regionalLocation} that ${customer} recommend`,
      ],
      intent: "Test local-area and neighborhood coverage",
      reason: `Tests whether the business appears when customers search for ${vertical} options around the target area.`,
    },
  ];

  return topicGroups.flatMap((group) =>
    repeatPrompt(group.prompts[0], 3).map((text, index) => ({
      id: makeId(),
      category: group.category,
      text,
      runIndex: index + 1,
      intent: group.intent,
      locationVariant: text.includes(secondaryLocation) ? secondaryLocation : location,
      reason: group.reason,
      businessName,
      generatedFrom: "site crawl",
    })),
  );
}

function repeatPrompt(prompt, count = 3) {
  const text = cleanText(prompt);
  return Array.from({ length: count }, () => text).filter(Boolean);
}

function buildPromptStrategy({ site, prompts, businessName, location }) {
  const serviceSignals = site.services.slice(0, 3).map((service) => `service: ${service}`);
  const locationSignals = [location, ...site.detectedLocations].filter(Boolean).slice(0, 3).map((item) => `location: ${item}`);
  const keywordSignals = site.keywords.slice(0, 3).map((keyword) => `keyword: ${keyword}`);
  const pageSignals = site.pages.slice(0, 2).map((page) => `page: ${page.title || new URL(page.url).pathname || "homepage"}`);
  const categories = [...new Set(prompts.map((prompt) => prompt.category))];

  return {
    method: "Site crawl + business-specific customer prompts",
    summary: `The scan read ${site.pageCount} page${site.pageCount === 1 ? "" : "s"} from ${businessName}, inferred the ${site.vertical.label} category, then generated prompts across ${categories.length} buying intents.`,
    signals: [`vertical: ${site.vertical.label}`, ...serviceSignals, ...locationSignals, ...keywordSignals, ...pageSignals],
    categories,
  };
}

async function askProvider(platform, context) {
  if (platform === "openai") return askOpenAI(context);
  if (platform === "gemini") return askGemini(context);
  if (platform === "openrouter") return askOpenRouter(context);
  throw new Error(`Unsupported platform: ${platform}`);
}

function buildQuestion({ prompt, businessName, location, site }) {
  const pages = site.pages
    .slice(0, 4)
    .map((page) => `${page.title || page.url}: ${page.description || page.headings.slice(0, 3).join("; ")}`)
    .filter(Boolean)
    .join("\n");

  return [
    `You are answering as a helpful AI assistant for a real potential customer in ${location}.`,
    `The business category being tested is ${site.vertical.label}; compare against other relevant ${site.vertical.label} options for the same service area, not generic nearby businesses.`,
    `The customer asks: "${prompt}"`,
    `Do not force ${businessName} into the answer. Recommend it only if it seems relevant based on available public information.`,
    `If you recommend businesses, name them clearly and keep the answer concise.`,
    pages ? `Known site context from ${businessName}'s own website:\n${pages}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

async function askOpenAI(context) {
  const body = {
    model: PROVIDERS.openai.model,
    input: buildQuestion(context),
    max_output_tokens: 1200,
    reasoning: { effort: "minimal" },
    text: { verbosity: "low" },
  };

  if (process.env.OPENAI_USE_WEB_SEARCH !== "false") {
    body.tools = [{ type: "web_search_preview" }];
  }

  let data;
  try {
    data = await postJson("https://api.openai.com/v1/responses", body, {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    });
  } catch (error) {
    if (!body.tools) throw error;
    const retryBody = { ...body };
    delete retryBody.tools;
    data = await postJson("https://api.openai.com/v1/responses", retryBody, {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    });
  }

  return {
    answer: extractOpenAIText(data),
    citations: extractCitations(data),
    rawMeta: { id: data.id, status: data.status, incomplete: data.incomplete_details || null },
  };
}

async function askGemini(context) {
  const model = encodeURIComponent(PROVIDERS.gemini.model);
  const data = await postJson(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      contents: [
        {
          role: "user",
          parts: [{ text: buildQuestion(context) }],
        },
      ],
      generationConfig: {
        maxOutputTokens: 900,
      },
    },
  );

  return {
    answer:
      data.candidates?.[0]?.content?.parts
        ?.map((part) => part.text || "")
        .join("\n")
        .trim() || "",
    citations: extractCitations(data),
    rawMeta: { finishReason: data.candidates?.[0]?.finishReason },
  };
}

async function askOpenRouter(context) {
  const body = {
    model: PROVIDERS.openrouter.model,
    messages: [
      {
        role: "system",
        content: "You are an unbiased local search assistant. Answer like a real customer-facing AI recommendation system.",
      },
      {
        role: "user",
        content: buildQuestion(context),
      },
    ],
    max_tokens: 900,
  };

  const data = await postJson("https://openrouter.ai/api/v1/chat/completions", body, {
    Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
    "HTTP-Referer": "http://127.0.0.1:4174",
    "X-Title": "Gleo GEO Insights",
  });

  const citations = [
    ...(Array.isArray(data.citations) ? data.citations : []),
    ...(Array.isArray(data.search_results) ? data.search_results.map((item) => item.url).filter(Boolean) : []),
  ];

  return {
    answer: data.choices?.[0]?.message?.content?.trim() || "",
    citations,
    rawMeta: { id: data.id },
  };
}

function analyzeAnswer(record) {
  const answer = cleanText(record.answer || "");
  const citations = [...new Set((record.citations || []).map(normalizeCitation).filter(Boolean))];
  const sources = citations.map((citation) => sourceFromCitation(citation)).filter(Boolean);
  const businesses = extractBusinesses(answer, record.businessName);
  const ownMentioned = includesBusiness(answer, record.businessName, record.website);
  const rank = ownMentioned ? estimateRank(answer, record.businessName, businesses) : null;
  const sentiment = ownMentioned ? estimateSentiment(answer, record.businessName) : "not mentioned";
  const context = ownMentioned ? estimateContext(answer, record.businessName) : "Not mentioned in the answer.";

  return {
    ...record,
    answer,
    citations,
    sources,
    businesses,
    ownMentioned,
    rank,
    sentiment,
    context,
  };
}

function buildMetrics({ results, prompts, site, businessName, website, previousScans = [] }) {
  const completed = results.filter((result) => result.answer && !result.error);
  const mentions = completed.filter((result) => result.ownMentioned);
  const mentionRate = percent(mentions.length, completed.length);
  const firstChoiceRate = percent(mentions.filter((result) => result.rank === 1).length, completed.length);
  const ranked = mentions.filter((result) => Number.isFinite(result.rank));
  const avgRank = ranked.length ? round(ranked.reduce((sum, result) => sum + result.rank, 0) / ranked.length, 1) : null;
  const sentimentCounts = {
    positive: mentions.filter((result) => result.sentiment === "positive").length,
    neutral: mentions.filter((result) => result.sentiment === "neutral").length,
    negative: mentions.filter((result) => result.sentiment === "negative").length,
  };
  const positiveRate = percent(sentimentCounts.positive, mentions.length);
  const ownHost = new URL(website).hostname.replace(/^www\./, "");
  const allSources = completed.flatMap((result) => result.sources || []);
  const ownSources = allSources.filter((source) => source.host?.replace(/^www\./, "") === ownHost);
  const sourceQuality = percent(ownSources.length, allSources.length || completed.length);
  const coverage = percent(new Set(mentions.map((result) => result.category)).size, prompts.length);
  const rankScore = avgRank ? Math.max(0, Math.min(100, 105 - avgRank * 20)) : 0;
  const sentimentScore = mentions.length ? Math.max(0, positiveRate - sentimentCounts.negative * 8) : 0;
  const visibilityScore = completed.length
    ? Math.round(mentionRate * 0.4 + rankScore * 0.22 + sourceQuality * 0.18 + sentimentScore * 0.1 + coverage * 0.1)
    : null;

  const platformScores = groupScores(completed, "platformLabel");
  const categoryScores = groupScores(completed, "category");
  const competitors = buildCompetitors(completed, businessName, completed.length);
  const topSources = buildTopSources(allSources);
  const citedPages = buildCitedPages(site.pages, completed);
  const riskFlags = buildRiskFlags(completed, businessName);
  const actions = buildActions({
    mentionRate,
    avgRank,
    sourceQuality,
    categoryScores,
    competitors,
    topSources,
    citedPages,
    site,
    businessName,
    completed,
  });
  const trend = buildTrend({
    current: { visibilityScore, mentionRate, avgRank, categoryScores, sourceQuality, positiveRate },
    previousScans,
    website,
    businessName,
  });

  return {
    completedAnswers: completed.length,
    ownMentionCount: mentions.length,
    totalAttempts: results.length,
    promptCount: prompts.length,
    mentionRate,
    firstChoiceRate,
    avgRank,
    visibilityScore,
    positiveRate,
    sentimentCounts,
    sourceQuality,
    coverage,
    trend,
    riskFlags,
    platformScores,
    categoryScores,
    competitors,
    sources: {
      topSources,
      citedPages,
      ownCitationCount: ownSources.length,
      totalCitationCount: allSources.length,
    },
    actions,
  };
}

function groupScores(results, key) {
  const groups = new Map();
  for (const result of results) {
    const label = result[key] || "Unknown";
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label).push(result);
  }

  return [...groups.entries()].map(([label, items]) => {
    const mentions = items.filter((item) => item.ownMentioned);
    const ranks = mentions.map((item) => item.rank).filter(Number.isFinite);
    return {
      label,
      attempts: items.length,
      mentionRate: percent(mentions.length, items.length),
      avgRank: ranks.length ? round(ranks.reduce((sum, rank) => sum + rank, 0) / ranks.length, 1) : null,
      positiveRate: percent(mentions.filter((item) => item.sentiment === "positive").length, mentions.length),
      visibilityScore: Math.round(
        percent(mentions.length, items.length) * 0.72 +
          (ranks.length ? Math.max(0, Math.min(100, 105 - round(ranks.reduce((sum, rank) => sum + rank, 0) / ranks.length, 1) * 20)) : 0) * 0.2 +
          percent(mentions.filter((item) => item.sentiment === "positive").length, mentions.length) * 0.08,
      ),
    };
  });
}

function buildTrend({ current, previousScans, website, businessName }) {
  const host = new URL(website).hostname.replace(/^www\./, "");
  const previous = previousScans
    .filter((scan) => {
      const scanHost = scan.hostname || (scan.website ? new URL(scan.website).hostname : "");
      return scanHost.replace(/^www\./, "") === host && Number.isFinite(scan.metrics?.visibilityScore);
    })
    .at(-1);

  if (!previous) {
    return {
      previousScanId: null,
      summary: `This is the first comparable scan for ${businessName}. Future scans can measure actual movement.`,
      visibilityScoreDelta: null,
      mentionRateDelta: null,
      avgRankDelta: null,
      sourceQualityDelta: null,
      categoryDeltas: [],
    };
  }

  if (!Number.isFinite(current.visibilityScore)) {
    return {
      previousScanId: previous.id,
      previousCreatedAt: previous.createdAt,
      summary: "The current scan did not complete enough AI answers to measure movement.",
      visibilityScoreDelta: null,
      mentionRateDelta: null,
      avgRankDelta: null,
      sourceQualityDelta: null,
      positiveRateDelta: null,
      categoryDeltas: [],
    };
  }

  const previousCategories = new Map((previous.metrics.categoryScores || []).map((item) => [item.label, item]));
  const categoryDeltas = current.categoryScores.map((category) => {
    const previousCategory = previousCategories.get(category.label);
    return {
      label: category.label,
      mentionRateDelta: previousCategory ? category.mentionRate - previousCategory.mentionRate : null,
      previousMentionRate: previousCategory?.mentionRate ?? null,
      currentMentionRate: category.mentionRate,
    };
  });

  return {
    previousScanId: previous.id,
    previousCreatedAt: previous.createdAt,
    summary: `Compared with the scan from ${previous.createdAt}.`,
    visibilityScoreDelta: current.visibilityScore - previous.metrics.visibilityScore,
    mentionRateDelta: current.mentionRate - previous.metrics.mentionRate,
    avgRankDelta:
      Number.isFinite(current.avgRank) && Number.isFinite(previous.metrics.avgRank)
        ? round(previous.metrics.avgRank - current.avgRank, 1)
        : null,
    sourceQualityDelta: current.sourceQuality - previous.metrics.sourceQuality,
    positiveRateDelta: current.positiveRate - previous.metrics.positiveRate,
    categoryDeltas,
  };
}

function buildRiskFlags(results, businessName) {
  const flags = [];
  const ownResults = results.filter((result) => result.ownMentioned);
  const unverifiable = ownResults.filter((result) => /cannot verify|could not verify|unclear|limited information|not enough information/i.test(result.answer));
  const negative = ownResults.filter((result) => result.sentiment === "negative");
  const conflictingHours = ownResults.filter((result) => /closed|open today|hours|after-hours/i.test(result.answer) && /unclear|cannot|could not|not list/i.test(result.answer));

  if (unverifiable.length) {
    flags.push({
      type: "verification",
      text: `${businessName} was mentioned with verification uncertainty in ${unverifiable.length} answer${unverifiable.length === 1 ? "" : "s"}.`,
    });
  }

  if (conflictingHours.length) {
    flags.push({
      type: "hours",
      text: `AI answers showed uncertainty around hours or urgent availability in ${conflictingHours.length} result${conflictingHours.length === 1 ? "" : "s"}.`,
    });
  }

  if (negative.length) {
    flags.push({
      type: "sentiment",
      text: `${negative.length} mention${negative.length === 1 ? "" : "s"} had negative context and should be reviewed in the evidence log.`,
    });
  }

  return flags;
}

function buildCompetitors(results, businessName, totalAnswers) {
  const map = new Map();
  for (const result of results) {
    for (const name of result.businesses) {
      if (sameBusiness(name, businessName)) continue;
      if (!map.has(name)) {
        map.set(name, {
          name,
          mentions: 0,
          ranks: [],
          sources: new Map(),
          categories: new Set(),
        });
      }
      const item = map.get(name);
      item.mentions += 1;
      item.categories.add(result.category);
      const rank = estimateRank(result.answer, name, result.businesses);
      if (rank) item.ranks.push(rank);
      for (const source of result.sources || []) {
        item.sources.set(source.host, (item.sources.get(source.host) || 0) + 1);
      }
    }
  }

  return [...map.values()]
    .map((item) => {
      const topSource = [...item.sources.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "answer text";
      return {
        name: item.name,
        mentions: item.mentions,
        mentionRate: percent(item.mentions, totalAnswers),
        avgRank: item.ranks.length ? round(item.ranks.reduce((sum, rank) => sum + rank, 0) / item.ranks.length, 1) : null,
        topSource,
        why: explainCompetitor(topSource, item.categories),
      };
    })
    .sort((a, b) => b.mentions - a.mentions)
    .slice(0, 6);
}

function buildTopSources(sources) {
  const map = new Map();
  for (const source of sources) {
    if (!source.host) continue;
    const current = map.get(source.host) || { host: source.host, count: 0, examples: [] };
    current.count += 1;
    if (source.url && current.examples.length < 3) current.examples.push(source.url);
    map.set(source.host, current);
  }
  return [...map.values()].sort((a, b) => b.count - a.count).slice(0, 8);
}

function buildCitedPages(pages, results) {
  return pages
    .map((page) => {
      const count = results.filter((result) =>
        result.citations?.some((citation) => citation.toLowerCase().startsWith(page.url.toLowerCase())),
      ).length;
      return {
        url: page.url,
        title: page.title || page.headings[0] || new URL(page.url).pathname || "Homepage",
        count,
      };
    })
    .filter((page) => page.count > 0)
    .sort((a, b) => b.count - a.count);
}

function buildActions({ mentionRate, avgRank, sourceQuality, categoryScores, competitors, topSources, citedPages, site, completed }) {
  if (!completed.length) return [];

  const actions = [];
  const ownCitations = citedPages.reduce((sum, page) => sum + page.count, 0);
  const topCategory = categoryScores.find((item) => /^top\b/i.test(item.label)) || categoryScores[0];
  const costCategory = categoryScores.find((item) => /cost|price|value|afford/i.test(item.label));
  const availabilityCategory = categoryScores.find((item) => /availability|urgent|scheduling|booking/i.test(item.label));
  const localCategory = categoryScores.find((item) => /local|near|location/i.test(item.label));
  const ownMentions = completed.filter((result) => result.ownMentioned);
  const negative = ownMentions.find((result) => result.sentiment === "negative");
  const uncertain = ownMentions.find((result) => /unclear|cannot verify|could not verify|limited information|not enough/i.test(`${result.answer} ${result.context}`));
  const weakestCategory = categoryScores
    .filter((item) => item.attempts > 0)
    .sort((a, b) => a.mentionRate - b.mentionRate)[0];

  if (negative) {
    actions.push({
      title: "Review negative answer context",
      impact: "High impact",
      reason: `AI described the business negatively for "${negative.prompt}".`,
      evidence: firstRelevantSentence(negative.answer || negative.context, /expensive|unclear|cannot verify|could not verify|limited|closed|not recommended|negative|concern|mixed/i),
      developerTasks: ["Add clarifying page copy that directly addresses the negative or confusing claim if it is inaccurate."],
    });
  }

  if (uncertain) {
    actions.push({
      title: "Make verification details clearer",
      impact: "High impact",
      reason: `AI showed uncertainty for "${uncertain.prompt}".`,
      evidence: firstRelevantSentence(uncertain.answer || uncertain.context, /unclear|cannot verify|could not verify|limited information|not enough/i),
      developerTasks: ["Add crawlable proof, hours, eligibility, contact, and FAQ details for this customer question."],
    });
  }

  if (weakestCategory && weakestCategory.mentionRate < 35) {
    actions.push({
      title: `Strengthen ${weakestCategory.label.toLowerCase()} pages`,
      impact: "High impact",
      reason: `AI answers are not reliably mentioning the business for ${weakestCategory.label.toLowerCase()} searches. Add direct, crawlable copy that answers those customer questions.`,
      evidence: `${weakestCategory.label} mention rate is ${weakestCategory.mentionRate}% across ${weakestCategory.attempts} answer${weakestCategory.attempts === 1 ? "" : "s"}.`,
      developerTasks: [
        "Create a concise section or page for this topic using customer question wording.",
        "Add proof points, locations served, next steps, and FAQs in crawlable HTML.",
      ],
    });
  }

  if (costCategory && costCategory.mentionRate < 45) {
    actions.push({
      title: "Clarify cost and value signals",
      impact: "Medium impact",
      reason: "Cost/value prompts need verifiable payment details, eligibility, plans, pricing ranges, or value proof where appropriate.",
      evidence: `Cost/value mention rate is ${costCategory.mentionRate}% across ${costCategory.attempts} answer${costCategory.attempts === 1 ? "" : "s"}.`,
      developerTasks: [
        "Add a pricing, payment, eligibility, or value FAQ if accurate for the business.",
        "Use concise answer-style copy for common cost questions.",
      ],
    });
  }

  if (availabilityCategory && availabilityCategory.mentionRate < 45) {
    actions.push({
      title: "Make availability and next steps clear",
      impact: "Medium impact",
      reason: "AI answers need clear booking, enrollment, consultation, hours, or contact details before recommending the business for action-oriented prompts.",
      evidence: `${availabilityCategory.label} mention rate is ${availabilityCategory.mentionRate}% across ${availabilityCategory.attempts} answer${availabilityCategory.attempts === 1 ? "" : "s"}.`,
      developerTasks: [
        "Make scheduling, hours, contact, enrollment, or availability details easy to crawl.",
        "Add FAQ/schema copy that directly answers how to get started.",
      ],
    });
  }

  if (ownCitations === 0 && topSources.length > 0) {
    actions.push({
      title: "Make your own pages easier to cite",
      impact: "High impact",
      reason: "AI answers are leaning on third-party sources more than your website. Add concise FAQs and source-like pages for important services.",
      evidence: `Own-site citation share is ${sourceQuality}%; top cited source is ${topSources[0].host}.`,
      developerTasks: [
        "Add focused service pages with short definitions, eligibility, locations served, and proof points.",
        "Make NAP details, testimonials, and FAQs crawlable without client-only rendering.",
      ],
    });
  }

  if (competitors[0]?.mentionRate > mentionRate) {
    actions.push({
      title: `Close the gap with ${competitors[0].name}`,
      impact: "Medium impact",
      reason: `${competitors[0].name} is mentioned more often, likely due to ${competitors[0].why.toLowerCase()}.`,
      evidence: `${competitors[0].name} has a ${competitors[0].mentionRate}% mention rate vs. ${mentionRate}% for this business.`,
      developerTasks: [
        "Review the competitor's public proof points and add equivalent verifiable evidence where accurate.",
        "Strengthen pages tied to the intent categories where the competitor appears most often.",
      ],
    });
  }

  if (!topCategory || topCategory.mentionRate < 40 || (avgRank && avgRank > 2.5)) {
    actions.push({
      title: "Strengthen top-recommendation proof",
      impact: "Medium impact",
      reason: "Best/top prompts need strong proof signals: reviews, awards, years in business, specialties, service area, and clear differentiators.",
      evidence: topCategory ? `${topCategory.label} mention rate is ${topCategory.mentionRate}%${avgRank ? ` and average rank is #${avgRank}` : ""}.` : "No top recommendation answers mentioned the business.",
      developerTasks: [
        "Add concise proof blocks for ratings, review count, awards, credentials, and primary differentiators.",
        "Create comparison-friendly copy that explains who the business is best for.",
      ],
    });
  }

  if (localCategory && localCategory.mentionRate < 40) {
    actions.push({
      title: "Improve local-area coverage",
      impact: "High impact",
      reason: "Local discovery prompts are especially important and should verify neighborhoods, nearby cities, and service radius.",
      evidence: `${localCategory.label} mention rate is ${localCategory.mentionRate}% across ${localCategory.attempts} answer${localCategory.attempts === 1 ? "" : "s"}.`,
      developerTasks: [
        "Add location/service-area sections with nearby neighborhoods and cities served.",
        "Make address, map links, and local landmarks crawlable.",
      ],
    });
  }

  if (site.pageCount < 3) {
    actions.push({
      title: "Expand crawlable site depth",
      impact: "Medium impact",
      reason: "The scan found only a few useful pages. AI systems need specific service, FAQ, location, and proof pages to verify claims.",
      evidence: `The crawl found ${site.pageCount} useful page${site.pageCount === 1 ? "" : "s"}.`,
      developerTasks: [
        "Add separate pages for core services, FAQ, locations, and contact/hours details.",
        "Ensure important content is present in initial HTML and linked from navigation.",
      ],
    });
  }

  return actions.slice(0, 5);
}

function firstRelevantSentence(text, pattern) {
  const clean = cleanText(text || "");
  if (!clean) return "The AI answer did not include enough detail to summarize the issue.";
  const sentences = clean.match(/[^.!?]+[.!?]?/g) || [clean];
  return (sentences.find((sentence) => pattern.test(sentence)) || sentences[0]).trim();
}

function parseJsonObject(text) {
  const clean = String(text || "").trim();
  if (!clean) return null;
  try {
    return JSON.parse(clean);
  } catch {
    const match = clean.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

function normalizeAIVertical(value, fallback) {
  const label = cleanText(value?.label || fallback?.label || "local business").slice(0, 80);
  return {
    label,
    specialty: cleanText(value?.specialty || fallback?.specialty || label).slice(0, 100),
    customer: cleanText(value?.customer || fallback?.customer || "customers").slice(0, 100),
    urgent: Boolean(value?.urgent ?? fallback?.urgent),
    priceLanguage: cleanText(value?.priceLanguage || fallback?.priceLanguage || `cost of ${label} near me`).slice(0, 160),
  };
}

function normalizeAIList(value, fallback = []) {
  const items = Array.isArray(value) ? value : [];
  return [...new Set(items.map((item) => cleanText(item)).filter(Boolean))].length
    ? [...new Set(items.map((item) => cleanText(item)).filter(Boolean))]
    : fallback;
}

function normalizeAIPromptGroups(groups, searchAreas, location) {
  if (!Array.isArray(groups)) return [];
  return groups
    .map((group) => {
      const prompts = normalizeAIList(group?.prompts, [group?.prompt])
        .map((prompt) => broadenPromptLocation(prompt, searchAreas, location))
        .filter(Boolean)
        .slice(0, 3);
      return {
        category: cleanText(group?.category).slice(0, 80),
        prompts,
        intent: cleanText(group?.intent).slice(0, 180),
        reason: cleanText(group?.reason).slice(0, 220),
      };
    })
    .filter((group) => group.category && group.prompts.length);
}

function broadenPromptLocation(prompt, searchAreas, location) {
  const text = cleanText(prompt);
  if (!text) return "";
  if (searchAreas.some((area) => normalized(text).includes(normalized(area)))) return text;
  return text.replace(/\bnear me\b/i, `near ${location}`);
}

function inferPromptLocation(prompt, searchAreas = [], fallback = "") {
  const text = normalized(prompt);
  return searchAreas.find((area) => text.includes(normalized(area))) || fallback;
}

function buildSearchAreas(location, detectedLocations = []) {
  const seed = [location, ...detectedLocations].map(cleanText).filter(Boolean);
  const city = cleanText(location.split(",")[0] || location);
  const state = cleanText(location.split(",")[1] || "");
  const lowerCity = city.toLowerCase();
  const areas = [...seed];

  const bayAreaCities = new Set([
    "sunnyvale",
    "menlo park",
    "palo alto",
    "mountain view",
    "cupertino",
    "santa clara",
    "san jose",
    "los gatos",
    "redwood city",
    "campbell",
    "saratoga",
  ]);

  if (state.toLowerCase().includes("ca") && bayAreaCities.has(lowerCity)) {
    const nearbyMap = {
      sunnyvale: ["Santa Clara, CA", "Mountain View, CA", "Cupertino, CA", "San Jose, CA", "South Bay", "Bay Area"],
      "menlo park": ["Palo Alto, CA", "Redwood City, CA", "Atherton, CA", "Mountain View, CA", "Peninsula", "Bay Area"],
      "palo alto": ["Menlo Park, CA", "Mountain View, CA", "Redwood City, CA", "Peninsula", "Bay Area"],
      "mountain view": ["Sunnyvale, CA", "Palo Alto, CA", "Los Altos, CA", "South Bay", "Bay Area"],
      cupertino: ["Sunnyvale, CA", "Santa Clara, CA", "San Jose, CA", "South Bay", "Bay Area"],
      "santa clara": ["Sunnyvale, CA", "San Jose, CA", "Cupertino, CA", "South Bay", "Bay Area"],
      "san jose": ["Santa Clara, CA", "Sunnyvale, CA", "Cupertino, CA", "South Bay", "Bay Area"],
      "los gatos": ["Campbell, CA", "Saratoga, CA", "San Jose, CA", "South Bay", "Bay Area"],
      "redwood city": ["Menlo Park, CA", "Palo Alto, CA", "San Mateo, CA", "Peninsula", "Bay Area"],
      campbell: ["Los Gatos, CA", "San Jose, CA", "Saratoga, CA", "South Bay", "Bay Area"],
      saratoga: ["Los Gatos, CA", "Cupertino, CA", "Campbell, CA", "South Bay", "Bay Area"],
    };
    areas.push(...(nearbyMap[lowerCity] || ["South Bay", "Bay Area"]));
  }

  if (!areas.some((area) => /area|county|region|valley|peninsula/i.test(area))) {
    areas.push(state ? `${state} Area` : "Nearby Area");
  }

  return [...new Set(areas.map(cleanText).filter(Boolean))].slice(0, 8);
}

function firstMeaningfulArea(areas = []) {
  return (areas || []).map(cleanText).find((area) => area && !/^(united states|usa|nearby area)$/i.test(area));
}

function extractBusinesses(answer, ownBusiness) {
  const candidates = new Set();
  if (includesBusiness(answer, ownBusiness)) candidates.add(cleanBusinessName(ownBusiness));

  const lines = answer.split(/(?:\n|\u2022|- |\d+\.\s+)/).map(cleanText).filter(Boolean);
  const suffixes =
    "(Dental|Dentist|Dentistry|Orthodontics|Plumbing|Plumber|HVAC|Heating|Cooling|Clinic|Studio|Group|Care|Center|Foundation|Practice|Company|Co\\.|Law|Salon|Spa|Med Spa|Restaurant|Cafe|Agency|CRM|Software|Solutions|Services|LLC|Inc\\.)";
  const suffixRegex = new RegExp(`\\b([A-Z][A-Za-z&' ]{2,55}\\s${suffixes})\\b`, "g");

  for (const line of lines) {
    for (const match of line.matchAll(suffixRegex)) {
      candidates.add(cleanBusinessName(match[1]));
    }

    const boldNames = [...line.matchAll(/\*\*([^*]{3,70})\*\*/g)].map((match) => cleanBusinessName(match[1]));
    for (const name of boldNames) {
      if (looksLikeBusiness(name)) candidates.add(name);
    }
  }

  return [...candidates].slice(0, 12);
}

function estimateRank(answer, businessName, businesses) {
  if (!answer) return null;
  const names = businesses.length ? businesses : [businessName];
  const positions = names
    .map((name) => ({ name, index: normalized(answer).indexOf(normalized(name)) }))
    .filter((item) => item.index >= 0)
    .sort((a, b) => a.index - b.index);
  const match = positions.find((item) => sameBusiness(item.name, businessName));
  if (!match) return includesBusiness(answer, businessName) ? positions.length + 1 : null;
  return positions.findIndex((item) => item.name === match.name) + 1;
}

function estimateSentiment(answer, businessName) {
  const windowText = mentionWindow(answer, businessName);
  const negative = /(avoid|bad|poor|complaint|expensive|unclear|cannot verify|could not verify|limited|closed|not recommended|negative)/i;
  const positive = /(best|top|recommended|strong|trusted|highly rated|positive|great|excellent|popular|good|premium|convenient|clear)/i;
  if (negative.test(windowText)) return "negative";
  if (positive.test(windowText)) return "positive";
  return "neutral";
}

function estimateContext(answer, businessName) {
  const text = mentionWindow(answer, businessName);
  if (/premium|high-end|cosmetic|luxury/i.test(text)) return "Mentioned as a premium or specialty option.";
  if (/affordable|budget|payment|insurance|financing/i.test(text)) return "Mentioned in an affordability or payment context.";
  if (/emergency|urgent|same-day|after-hours/i.test(text)) return "Mentioned for urgent or emergency intent.";
  if (/family|kids|children|pediatric|parents/i.test(text)) return "Mentioned for family or child-friendly intent.";
  return "Mentioned as a general recommendation.";
}

function mentionWindow(answer, businessName) {
  const lower = answer.toLowerCase();
  const aliases = businessAliases(businessName);
  const index = aliases.map((alias) => lower.indexOf(alias.toLowerCase())).find((value) => value >= 0) ?? -1;
  if (index < 0) return answer.slice(0, 500);
  return answer.slice(Math.max(0, index - 220), Math.min(answer.length, index + 420));
}

function includesBusiness(answer, businessName, website = "") {
  const text = normalized(answer);
  return businessAliases(businessName, website).some((alias) => text.includes(normalized(alias)));
}

function businessAliases(name, website = "") {
  const aliases = new Set();
  if (name) {
    aliases.add(name);
    aliases.add(name.replace(/\b(LLC|Inc\.?|Co\.?|Company|Group|Studio|Practice|Foundation|Clinic|Center|Centre)\b/gi, "").trim());
  }
  if (website) {
    const host = new URL(website).hostname.replace(/^www\./, "");
    aliases.add(host);
    aliases.add(host.split(".")[0].replace(/[-_]/g, " "));
  }
  return [...aliases].filter((alias) => alias && alias.length > 2);
}

function sameBusiness(a, b) {
  const left = normalized(a).replace(/\b(llc|inc|co|company|group|studio|practice|foundation|clinic|center|centre)\b/g, "").trim();
  const right = normalized(b).replace(/\b(llc|inc|co|company|group|studio|practice|foundation|clinic|center|centre)\b/g, "").trim();
  return left === right || left.includes(right) || right.includes(left);
}

function looksLikeBusiness(text) {
  if (!text || text.length < 3 || text.length > 70) return false;
  if (/^(the|and|or|best|top|why|summary|note)$/i.test(text)) return false;
  return /[A-Z]/.test(text[0]);
}

function cleanBusinessName(text) {
  return cleanText(text)
    .replace(/^[#:*\s]+/, "")
    .replace(/[.。:,;]+$/, "")
    .trim();
}

function inferVertical(text, url) {
  const lower = `${text} ${url}`.toLowerCase();
  const verticals = [
    { label: "dentist", specialty: "cosmetic dentistry", customer: "patients", urgent: true, terms: ["dentist", "dental", "orthodont", "invisalign", "teeth"] },
    { label: "acupuncture clinic", specialty: "acupuncture treatment", customer: "patients", urgent: false, terms: ["acupuncture", "acupuncturist", "traditional chinese medicine", "tcm", "cupping"] },
    { label: "plumber", specialty: "emergency plumbing", customer: "homeowners", urgent: true, terms: ["plumber", "plumbing", "water heater", "drain"] },
    { label: "HVAC company", specialty: "AC repair", customer: "homeowners", urgent: true, terms: ["hvac", "air conditioning", "furnace", "heating"] },
    { label: "law firm", specialty: "legal consultation", customer: "clients", urgent: false, terms: ["law firm", "attorney", "lawyer", "legal"] },
    { label: "med spa", specialty: "botox", customer: "clients", urgent: false, terms: ["med spa", "botox", "filler", "aesthetic"] },
    { label: "restaurant", specialty: "private dining", customer: "diners", urgent: false, terms: ["restaurant", "menu", "reservation", "dining"] },
    { label: "Hindu temple", specialty: "pooja services", customer: "devotees and families", urgent: false, priceLanguage: "donation and service information for Hindu temple near me", terms: ["hindu temple", "temple", "pooja", "puja", "aarthi", "darshan", "panchangam", "devotees", "religious", "spiritual"] },
    { label: "sports foundation", specialty: "youth sports programs", customer: "families and athletes", urgent: false, terms: ["sports foundation", "sports", "athletes", "youth program", "training", "camp"] },
    { label: "fitness studio", specialty: "personal training", customer: "members", urgent: false, terms: ["fitness", "personal training", "gym", "workout", "pilates", "yoga"] },
    { label: "CRM platform", specialty: "sales lead tracking", customer: "small businesses", urgent: false, terms: ["crm", "sales leads", "pipeline", "software"] },
  ];

  const match = verticals
    .map((vertical) => ({
      ...vertical,
      score: vertical.terms.reduce((sum, term) => sum + (lower.includes(term) ? 1 : 0), 0),
    }))
    .sort((a, b) => b.score - a.score)[0];

  if (!match?.score) return { label: inferGenericVertical(lower), specialty: "service", customer: "customers", urgent: false, terms: [] };
  if (match.label === "sports foundation" && match.score < 2 && /\btemple|pooja|puja|aarthi|darshan|devotee|hindu\b/.test(lower)) {
    return verticals.find((vertical) => vertical.label === "Hindu temple");
  }
  return match;
}

function inferServices(text, vertical) {
  const lower = text.toLowerCase();
  const serviceMap = {
    dentist: ["Invisalign", "cosmetic dentistry", "dental implants", "emergency dental care", "teeth whitening", "pediatric dentistry"],
    "acupuncture clinic": ["acupuncture treatment", "cupping therapy", "herbal medicine", "pain relief", "fertility acupuncture"],
    plumber: ["emergency plumbing", "drain cleaning", "water heater repair", "leak repair", "sewer line repair"],
    "HVAC company": ["AC repair", "furnace repair", "heat pump installation", "maintenance plans"],
    "law firm": ["personal injury lawyer", "family law", "estate planning", "business law"],
    "med spa": ["Botox", "dermal fillers", "laser treatments", "facials"],
    restaurant: ["private dining", "brunch", "catering", "reservations"],
    "Hindu temple": ["pooja services", "religious events", "cultural classes", "community programs", "priest services"],
    "sports foundation": ["youth sports programs", "sports training", "camps", "athlete development", "community programs"],
    "fitness studio": ["personal training", "group classes", "pilates", "yoga", "strength training"],
    "CRM platform": ["sales lead tracking", "pipeline management", "CRM automation", "reporting"],
  };

  return (serviceMap[vertical.label] || [])
    .filter((service) => lower.includes(service.toLowerCase().split(" ")[0]))
    .concat(vertical.specialty || [])
    .filter(Boolean)
    .filter((service, index, list) => list.indexOf(service) === index)
    .slice(0, 4);
}

function inferGenericVertical(lowerText) {
  const titlePatterns = [
    /\b([a-z]+(?:\s+[a-z]+){0,2})\s+(clinic|studio|foundation|center|centre|practice|agency|company|platform|school)\b/,
    /\b([a-z]+(?:\s+[a-z]+){0,2})\s+(services|programs|training|therapy|care)\b/,
  ];
  for (const pattern of titlePatterns) {
    const match = lowerText.match(pattern);
    if (match) return cleanText(match[0]).slice(0, 48);
  }
  return "business";
}

function capitalizeWords(value) {
  return cleanText(value)
    .split(/\s+/)
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
    .join(" ");
}

function inferLocations(text) {
  const matches = [...text.matchAll(/\b([A-Z][a-z]+(?:\s[A-Z][a-z]+){0,2}),\s([A-Z]{2})\b/g)]
    .map((match) => `${match[1]}, ${match[2]}`)
    .filter((value) => !/Copyright|Privacy|Terms/.test(value));
  return [...new Set(matches)].slice(0, 5);
}

function extractKeywords(text) {
  const stop = new Set("about after also are business can care contact from have more near page services that their this with your".split(" "));
  const counts = new Map();
  for (const word of text.toLowerCase().match(/[a-z][a-z-]{3,}/g) || []) {
    if (stop.has(word)) continue;
    counts.set(word, (counts.get(word) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 18)
    .map(([word]) => word);
}

function explainCompetitor(source, categories) {
  const joined = [...categories].join(", ").toLowerCase();
  if (/google|reviews|yelp|healthgrades/i.test(source)) return "More or stronger review proof";
  if (/emergency|urgent/.test(joined)) return "Clearer urgent-service evidence";
  if (/price|affordability/.test(joined)) return "Clearer pricing or financing information";
  if (/answer text/.test(source)) return "Repeated model recognition in answer text";
  return `Stronger citations from ${source}`;
}

function sourceFromCitation(citation) {
  if (!citation) return null;
  try {
    const url = new URL(citation);
    return {
      url: url.toString(),
      host: url.hostname.replace(/^www\./, ""),
    };
  } catch {
    const host = citation.replace(/^https?:\/\//, "").split(/[/?#]/)[0];
    return host ? { url: citation, host } : null;
  }
}

function normalizeCitation(citation) {
  if (typeof citation === "string") return citation;
  if (citation?.url) return citation.url;
  if (citation?.uri) return citation.uri;
  if (citation?.title) return citation.title;
  return "";
}

function extractCitations(data) {
  const citations = [];

  function walk(value) {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) {
      value.forEach(walk);
      return;
    }
    if (value.url) citations.push(value.url);
    if (value.uri) citations.push(value.uri);
    for (const child of Object.values(value)) walk(child);
  }

  walk(data);
  return [...new Set(citations)].slice(0, 20);
}

function extractOpenAIText(data) {
  if (data.output_text) return cleanText(data.output_text);
  const chunks = [];
  for (const item of data.output || []) {
    for (const content of item.content || []) {
      if (content.text) chunks.push(content.text);
    }
  }
  return cleanText(chunks.join("\n"));
}

async function postJson(url, body, headers = {}) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60000),
  });

  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  if (!response.ok) {
    const message = data.error?.message || data.message || text || `${response.status} ${response.statusText}`;
    throw new Error(message);
  }

  return data;
}

async function fetchText(url, timeoutMs) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Gleo GEO Insights/1.0",
      Accept: "text/html,application/xhtml+xml",
    },
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
    throw new Error("URL did not return HTML");
  }
  return response.text();
}

async function getConfig() {
  const scans = await readScans();
  return {
    providers: Object.fromEntries(
      Object.entries(PROVIDERS).map(([key, provider]) => [
        key,
        {
          label: provider.label,
          model: provider.model,
          configured: isProviderConfigured(key),
          keyName: provider.keyName,
        },
      ]),
    ),
    limits: {
      maxCrawlPages: MAX_CRAWL_PAGES,
      maxScanPrompts: MAX_SCAN_PROMPTS,
    },
    latestScanId: scans.at(-1)?.id || null,
  };
}

function normalizePlatforms(platforms) {
  const selected = Array.isArray(platforms) && platforms.length ? platforms : Object.keys(PROVIDERS);
  return selected.filter((platform) => Object.hasOwn(PROVIDERS, platform));
}

function isProviderConfigured(platform) {
  return Boolean(process.env[PROVIDERS[platform]?.keyName]);
}

function normalizeUrl(value) {
  if (!value || typeof value !== "string") throw new Error("Website URL is required.");
  const withProtocol = /^https?:\/\//i.test(value.trim()) ? value.trim() : `https://${value.trim()}`;
  const url = new URL(withProtocol);
  url.hash = "";
  return url.toString().replace(/\/$/, "");
}

function inferNameFromUrl(url) {
  const host = new URL(url).hostname.replace(/^www\./, "").split(".")[0];
  return host
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

async function readJsonBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  return JSON.parse(raw);
}

async function readScans() {
  if (!existsSync(SCANS_FILE)) return [];
  try {
    return JSON.parse(await readFile(SCANS_FILE, "utf8"));
  } catch {
    return [];
  }
}

async function writeScans(scans) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(SCANS_FILE, `${JSON.stringify(scans, null, 2)}\n`, "utf8");
}

async function serveStatic(pathname, response) {
  const safePath = pathname === "/" ? "/index.html" : pathname;
  const filePath = path.normalize(path.join(__dirname, safePath));
  if (!filePath.startsWith(__dirname)) return sendText(response, "Not found", 404);

  try {
    const body = await readFile(filePath);
    response.writeHead(200, {
      "Content-Type": MIME_TYPES[path.extname(filePath)] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    response.end(body);
  } catch {
    sendText(response, "Not found", 404);
  }
}

function sendJson(response, body, status = 200) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body));
}

function sendText(response, body, status = 200) {
  response.writeHead(status, { "Content-Type": "text/plain; charset=utf-8" });
  response.end(body);
}

function loadDotEnv() {
  const envPath = path.join(__dirname, ".env");
  if (!existsSync(envPath)) return;
  const raw = existsSync(envPath) ? readFileSyncSafe(envPath) : "";
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

function readFileSyncSafe(filePath) {
  return existsSync(filePath) ? readFileSync(filePath, "utf8") : "";
}

function matchFirst(text, regex) {
  return text.match(regex)?.[1] || "";
}

function stripTags(text) {
  return text.replace(/<[^>]+>/g, " ");
}

function decodeEntities(text) {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function cleanText(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

function normalized(text) {
  return cleanText(text).toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ");
}

function percent(part, total) {
  return total ? Math.round((part / total) * 100) : 0;
}

function round(value, digits = 0) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function clamp(value, min, max) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function makeId() {
  return crypto.randomBytes(8).toString("hex");
}
