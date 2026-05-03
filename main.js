const state = {
  data: null,
  filteredStatements: [],
  filters: {
    type: null,
    pattern: null,
    object: null,
    modifier: null,
    word: null,
  },
};

const colors = {
  like: "#38bdf8",
  than: "#a78bfa",
  both: "#fbbf24",
  unknown: "#94a3b8",
};

const commonWordsForView = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "but",
  "i",
  "you",
  "me",
  "my",
  "your",
  "we",
  "they",
  "it",
  "is",
  "was",
  "were",
  "to",
  "of",
  "in",
  "on",
  "for",
  "with",
  "as",
  "at",
  "by",
  "from",
]);

const tooltip = d3.select("#tooltip");

function showTooltip(event, html) {
  tooltip
    .style("opacity", 1)
    .style("left", `${event.clientX}px`)
    .style("top", `${event.clientY}px`)
    .html(html);
}

function hideTooltip() {
  tooltip.style("opacity", 0);
}

function formatNumber(value) {
  return d3.format(",")(value || 0);
}

function getWeightedTypeCounts(statements) {
  return d3
    .rollups(
      statements,
      (rows) => d3.sum(rows, (d) => d.count),
      (d) => d.comparison_type || "unknown",
    )
    .map(([type, count]) => ({ type, count }));
}

function normalizeDashboardData(data) {
  data.summary = data.summary || {};
  data.statements = data.statements || [];
  data.patterns = data.patterns || [];
  data.comparison_objects = data.comparison_objects || [];
  data.than_modifiers = data.than_modifiers || [];
  data.words = data.words || [];

  data.statements.forEach((d) => {
    d.count = +d.count || 0;
    d.word_count = +d.word_count || 0;
    d.char_count = +d.char_count || 0;
    d.comparison_type = d.comparison_type || "unknown";
    d.comparison_statement = d.comparison_statement || "";
    d.pattern = d.pattern || "";
    d.comparison_object = d.comparison_object || "";
    d.than_modifier = d.than_modifier || "";
  });

  data.patterns.forEach((d) => (d.count = +d.count || 0));
  data.comparison_objects.forEach((d) => (d.count = +d.count || 0));
  data.than_modifiers.forEach((d) => (d.count = +d.count || 0));
  data.words.forEach((d) => (d.count = +d.count || 0));

  return data;
}

function renderDashboard(data) {
  state.data = normalizeDashboardData(data);

  renderStats();
  renderTakeaways();
  renderInsights();
  renderActiveFilters();
  updateFilteredViews();
  renderTypeDonut();
  renderDistributionChart();
  renderScatterChart();

  renderHorizontalBars("#patternChart", state.data.patterns.slice(0, 18), {
    labelKey: "pattern",
    valueKey: "count",
    color: "#38bdf8",
    emptyMessage: "No pattern data found.",
    filterType: "pattern",
  });

  renderHorizontalBars(
    "#modifierChart",
    state.data.than_modifiers.slice(0, 18),
    {
      labelKey: "than_modifier",
      valueKey: "count",
      color: "#a78bfa",
      emptyMessage: "No than-modifier data found.",
      filterType: "modifier",
    },
  );

  renderHorizontalBars(
    "#objectChart",
    state.data.comparison_objects.slice(0, 18),
    {
      labelKey: "comparison_object",
      valueKey: "count",
      color: "#fbbf24",
      emptyMessage: "No comparison-object data found.",
      filterType: "object",
    },
  );

  renderWordCloud();
  renderWordBarChart();
  renderPatternGroups();
  renderClusters();
}

function renderStats() {
  const summary = state.data.summary;
  const statements = state.data.statements;

  const weightedTypeCounts = getWeightedTypeCounts(statements);
  const likeTotal =
    weightedTypeCounts.find((d) => d.type === "like")?.count || 0;
  const thanTotal =
    weightedTypeCounts.find((d) => d.type === "than")?.count || 0;
  const bothTotal =
    weightedTypeCounts.find((d) => d.type === "both")?.count || 0;

  const cards = [
    ["Total Lines", summary.total_comparison_lines],
    ["Unique Lines", summary.unique_comparison_lines || statements.length],
    ["Like Lines", likeTotal],
    ["Than Lines", thanTotal],
    ["Both Lines", bothTotal],
    ["Avg. Words", summary.average_word_count],
  ];

  d3.select("#stats")
    .selectAll(".stat-card")
    .data(cards)
    .join("article")
    .attr("class", "card stat-card")
    .html(
      (d) => `
              <div class="stat-label">${d[0]}</div>
              <div class="stat-value">${
                typeof d[1] === "number" ? formatNumber(d[1]) : d[1] || 0
              }</div>
            `,
    );
}

function renderTakeaways() {
  const statements = [...state.data.statements].sort(
    (a, b) =>
      d3.descending(a.count, b.count) ||
      d3.ascending(a.comparison_statement, b.comparison_statement),
  );

  const topStatement = statements[0];
  const topPattern = state.data.patterns[0];
  const topObject = state.data.comparison_objects[0];
  const topModifier = state.data.than_modifiers[0];

  const typeCounts = getWeightedTypeCounts(state.data.statements);
  const total = d3.sum(typeCounts, (d) => d.count);
  const topType = [...typeCounts].sort((a, b) =>
    d3.descending(a.count, b.count),
  )[0];

  const rows = [
    [
      "Most repeated line",
      topStatement
        ? `"${topStatement.comparison_statement}" (${topStatement.count})`
        : "-",
    ],
    [
      "Most common pattern",
      topPattern ? `${topPattern.pattern} (${topPattern.count})` : "-",
    ],
    [
      "Top comparison object",
      topObject ? `${topObject.comparison_object} (${topObject.count})` : "-",
    ],
    [
      "Top than modifier",
      topModifier ? `${topModifier.than_modifier} (${topModifier.count})` : "-",
    ],
    [
      "Dominant comparison type",
      topType && total
        ? `${topType.type} (${Math.round((topType.count / total) * 100)}%)`
        : "-",
    ],
    [
      "Average comparison length",
      `${state.data.summary.average_word_count || 0} words`,
    ],
  ];

  d3.select("#takeaways")
    .selectAll(".takeaway")
    .data(rows)
    .join("div")
    .attr("class", "takeaway")
    .html(
      (d) => `
              <div class="takeaway-label">${escapeHtml(d[0])}</div>
              <div class="takeaway-value">${escapeHtml(d[1])}</div>
            `,
    );
}

function renderInsights() {
  const statements = state.data.statements;
  const totalWeighted = d3.sum(statements, (d) => d.count);
  const uniqueCount = statements.length;
  const typeCounts = getWeightedTypeCounts(statements).sort((a, b) =>
    d3.descending(a.count, b.count),
  );
  const topType = typeCounts[0];
  const singletons = statements.filter((d) => d.count === 1).length;
  const topPattern = state.data.patterns[0];
  const topObject = state.data.comparison_objects[0];
  const topModifier = state.data.than_modifiers[0];

  const insights = [];

  if (topType && totalWeighted) {
    insights.push(
      `<strong>${escapeHtml(topType.type)}</strong> comparisons account for <strong>${Math.round(
        (topType.count / totalWeighted) * 100,
      )}%</strong> of weighted comparison lines.`,
    );
  }

  if (topPattern) {
    insights.push(
      `The most common extracted phrase pattern is <strong>${escapeHtml(
        topPattern.pattern,
      )}</strong>, appearing <strong>${formatNumber(
        topPattern.count,
      )}</strong> times.`,
    );
  }

  if (topObject) {
    insights.push(
      `The most common comparison object is <strong>${escapeHtml(
        topObject.comparison_object,
      )}</strong>.`,
    );
  }

  if (topModifier) {
    insights.push(
      `For <code>than</code> statements, the top modifier is <strong>${escapeHtml(
        topModifier.than_modifier,
      )}</strong>.`,
    );
  }

  if (uniqueCount) {
    insights.push(
      `<strong>${formatNumber(singletons)}</strong> of <strong>${formatNumber(
        uniqueCount,
      )}</strong> unique statements appear only once.`,
    );
  }

  d3.select("#insights")
    .selectAll("li")
    .data(insights)
    .join("li")
    .html((d) => d);
}

function getFilteredStatements({ ignoreTopN = false } = {}) {
  const search = d3
    .select("#searchInput")
    .property("value")
    .trim()
    .toLowerCase();

  const dropdownType = d3.select("#typeFilter").property("value");
  const topN = +d3.select("#topN").property("value");

  let rows = [...state.data.statements];

  const activeType = state.filters.type || dropdownType;

  if (activeType && activeType !== "all") {
    rows = rows.filter((d) => d.comparison_type === activeType);
  }

  if (state.filters.pattern) {
    rows = rows.filter((d) => d.pattern === state.filters.pattern);
  }

  if (state.filters.object) {
    rows = rows.filter((d) => d.comparison_object === state.filters.object);
  }

  if (state.filters.modifier) {
    rows = rows.filter((d) => d.than_modifier === state.filters.modifier);
  }

  if (state.filters.word) {
    const wordRegex = new RegExp(`\\b${escapeRegex(state.filters.word)}\\b`);
    rows = rows.filter((d) => wordRegex.test(d.comparison_statement));
  }

  if (search) {
    rows = rows.filter((d) => {
      return [
        d.comparison_statement,
        d.pattern,
        d.comparison_object,
        d.than_modifier,
        d.first_marker,
        d.word_before_marker,
        d.word_after_marker,
      ].some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(search),
      );
    });
  }

  rows.sort(
    (a, b) =>
      d3.descending(a.count, b.count) ||
      d3.ascending(a.comparison_statement, b.comparison_statement),
  );

  return ignoreTopN ? rows : rows.slice(0, topN);
}

function updateFilteredViews() {
  state.filteredStatements = getFilteredStatements();
  renderActiveFilters();
  renderStatementChart();
  renderTable();
  renderScatterChart();
}

function setFilter(type, value) {
  state.filters[type] = state.filters[type] === value ? null : value;

  if (type === "type") {
    d3.select("#typeFilter").property("value", state.filters.type || "all");
  }

  updateFilteredViews();
  showTab("statements");
}

function clearFilter(type) {
  state.filters[type] = null;

  if (type === "type") {
    d3.select("#typeFilter").property("value", "all");
  }

  updateFilteredViews();
}

function clearAllFilters() {
  state.filters = {
    type: null,
    pattern: null,
    object: null,
    modifier: null,
    word: null,
  };

  d3.select("#typeFilter").property("value", "all");
  d3.select("#searchInput").property("value", "");

  updateFilteredViews();
}

function renderActiveFilters() {
  const filters = Object.entries(state.filters).filter(([, value]) => value);
  const container = d3.select("#activeFilters");

  container.classed("visible", filters.length > 0);

  if (!filters.length) {
    container.html("");
    return;
  }

  container.html("");

  container
    .append("span")
    .style("color", "var(--muted)")
    .text("Active filters:");

  container
    .selectAll(".filter-chip")
    .data(filters)
    .join("span")
    .attr("class", "filter-chip")
    .html(
      ([key, value]) => `
              ${escapeHtml(key)}: ${escapeHtml(value)}
              <button aria-label="Remove ${escapeHtml(key)} filter" data-filter="${escapeHtml(
                key,
              )}">×</button>
            `,
    );

  container.selectAll(".filter-chip button").on("click", function () {
    clearFilter(this.dataset.filter);
  });

  container.append("button").text("Clear all").on("click", clearAllFilters);
}

function renderStatementChart() {
  const data = state.filteredStatements;
  const container = d3.select("#statementChart");
  container.selectAll("*").remove();

  if (!data.length) {
    container
      .append("div")
      .attr("class", "empty")
      .text("No statements match the current filters.");
    return;
  }

  const width = container.node().clientWidth;
  const rowHeight = 30;
  const margin = { top: 12, right: 42, bottom: 28, left: 230 };
  const height = Math.max(
    360,
    margin.top + margin.bottom + data.length * rowHeight,
  );

  const svg = container
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("width", "100%")
    .attr("height", height)
    .attr("preserveAspectRatio", "xMinYMin meet");

  const x = d3
    .scaleLinear()
    .domain([0, d3.max(data, (d) => d.count) || 1])
    .nice()
    .range([margin.left, width - margin.right]);

  const y = d3
    .scaleBand()
    .domain(data.map((d) => d.comparison_statement))
    .range([margin.top, height - margin.bottom])
    .padding(0.22);

  svg
    .append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x).ticks(5).tickSizeOuter(0));

  svg
    .append("g")
    .selectAll("text")
    .data(data)
    .join("text")
    .attr("x", margin.left - 12)
    .attr("y", (d) => y(d.comparison_statement) + y.bandwidth() / 2)
    .attr("dy", "0.35em")
    .attr("text-anchor", "end")
    .attr("fill", "var(--muted)")
    .attr("font-size", 12)
    .text((d) => truncate(d.comparison_statement, 34));

  svg
    .append("g")
    .selectAll("rect")
    .data(data)
    .join("rect")
    .attr("class", "clickable")
    .attr("x", margin.left)
    .attr("y", (d) => y(d.comparison_statement))
    .attr("width", (d) => Math.max(2, x(d.count) - margin.left))
    .attr("height", y.bandwidth())
    .attr("rx", 8)
    .attr("fill", (d) => colors[d.comparison_type] || colors.unknown)
    .on("click", (event, d) => openDrawer(d))
    .on("mousemove", (event, d) => {
      showTooltip(
        event,
        `
                <strong>${escapeHtml(d.comparison_statement)}</strong><br>
                Count: ${formatNumber(d.count)}<br>
                Type: ${escapeHtml(d.comparison_type)}<br>
                Pattern: ${escapeHtml(d.pattern || "-")}<br>
                Object: ${escapeHtml(d.comparison_object || "-")}
              `,
      );
    })
    .on("mouseleave", hideTooltip);

  svg
    .append("g")
    .selectAll("text")
    .data(data)
    .join("text")
    .attr("class", "bar-label")
    .attr("x", (d) => x(d.count) + 7)
    .attr("y", (d) => y(d.comparison_statement) + y.bandwidth() / 2)
    .attr("dy", "0.35em")
    .text((d) => d.count);
}

function renderTypeDonut() {
  const container = d3.select("#typeDonut");
  container.selectAll("*").remove();

  const data = getWeightedTypeCounts(state.data.statements)
    .filter((d) => d.count > 0)
    .sort((a, b) => d3.descending(a.count, b.count));

  if (!data.length) {
    container.append("div").attr("class", "empty").text("No type data found.");
    return;
  }

  const width = container.node().clientWidth;
  const height = 360;
  const radius = Math.min(width, height) / 2 - 36;

  const svg = container
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .append("g")
    .attr("transform", `translate(${width / 2},${height / 2})`);

  const pie = d3
    .pie()
    .value((d) => d.count)
    .sort(null);

  const arc = d3
    .arc()
    .innerRadius(radius * 0.58)
    .outerRadius(radius);

  svg
    .selectAll("path")
    .data(pie(data))
    .join("path")
    .attr("class", "clickable")
    .attr("d", arc)
    .attr("fill", (d) => colors[d.data.type] || colors.unknown)
    .attr("stroke", "#0f172a")
    .attr("stroke-width", 3)
    .on("click", (event, d) => setFilter("type", d.data.type))
    .on("mousemove", (event, d) => {
      showTooltip(
        event,
        `
                <strong>${escapeHtml(d.data.type)}</strong><br>
                Count: ${formatNumber(d.data.count)}<br>
                Click to filter
              `,
      );
    })
    .on("mouseleave", hideTooltip);

  const total = d3.sum(data, (d) => d.count);

  svg
    .append("text")
    .attr("text-anchor", "middle")
    .attr("dy", "-0.15em")
    .attr("fill", "var(--text)")
    .attr("font-size", 30)
    .attr("font-weight", 800)
    .text(formatNumber(total));

  svg
    .append("text")
    .attr("text-anchor", "middle")
    .attr("dy", "1.35em")
    .attr("fill", "var(--muted)")
    .attr("font-size", 13)
    .text("weighted lines");

  const legend = container
    .append("div")
    .style("display", "flex")
    .style("justify-content", "center")
    .style("gap", "12px")
    .style("flex-wrap", "wrap")
    .style("padding", "0 18px 18px");

  legend
    .selectAll("span")
    .data(data)
    .join("span")
    .attr("class", (d) => `pill ${d.type} clickable`)
    .text((d) => `${d.type}: ${formatNumber(d.count)}`)
    .on("click", (event, d) => setFilter("type", d.type));
}

function renderHorizontalBars(selector, data, options) {
  const container = d3.select(selector);
  container.selectAll("*").remove();

  const labelKey = options.labelKey;
  const valueKey = options.valueKey;
  const color = options.color;

  data = data.filter((d) => d[labelKey] && d[valueKey] > 0);

  if (!data.length) {
    container
      .append("div")
      .attr("class", "empty")
      .text(options.emptyMessage || "No data found.");
    return;
  }

  const width = container.node().clientWidth;
  const rowHeight = 28;

  const margin = {
    top: 12,
    right: options.marginRight ?? 42,
    bottom: 28,
    left: options.marginLeft ?? Math.min(66, Math.max(88, width * 0.22)),
  };

  const height = Math.max(
    360,
    margin.top + margin.bottom + data.length * rowHeight,
  );

  const svg = container
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("width", "100%")
    .attr("height", height)
    .attr("preserveAspectRatio", "xMinYMin meet");

  const x = d3
    .scaleLinear()
    .domain([0, d3.max(data, (d) => d[valueKey]) || 1])
    .nice()
    .range([margin.left, width - margin.right]);

  const y = d3
    .scaleBand()
    .domain(data.map((d) => d[labelKey]))
    .range([margin.top, height - margin.bottom])
    .padding(0.25);

  svg
    .append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x).ticks(4).tickSizeOuter(0));

  svg
    .append("g")
    .selectAll("text")
    .data(data)
    .join("text")
    .attr("x", margin.left - 12)
    .attr("y", (d) => y(d[labelKey]) + y.bandwidth() / 2)
    .attr("dy", "0.35em")
    .attr("text-anchor", "end")
    .attr("fill", "var(--muted)")
    .attr("font-size", 12)
    .text((d) => truncate(d[labelKey], 25));

  svg
    .append("g")
    .selectAll("rect")
    .data(data)
    .join("rect")
    .attr("class", options.clickable ? "clickable" : null)
    .attr("x", margin.left)
    .attr("y", (d) => y(d[labelKey]))
    .attr("width", (d) => Math.max(2, x(d[valueKey]) - margin.left))
    .attr("height", y.bandwidth())
    .attr("rx", 8)
    .attr("fill", color)
    .on("click", (event, d) => {
      if (options.clickable && options.filterType) {
        setFilter(options.filterType, d[labelKey]);
      }
    })
    .on("mousemove", (event, d) => {
      showTooltip(
        event,
        `
        <strong>${escapeHtml(d[labelKey])}</strong><br>
        Count: ${formatNumber(d[valueKey])}<br>
        ${options.clickable && options.filterType ? "Click to filter" : ""}
      `,
      );
    })
    .on("mouseleave", hideTooltip);

  svg
    .append("g")
    .selectAll("text")
    .data(data)
    .join("text")
    .attr("class", "bar-label")
    .attr("x", (d) => x(d[valueKey]) + 7)
    .attr("y", (d) => y(d[labelKey]) + y.bandwidth() / 2)
    .attr("dy", "0.35em")
    .text((d) => d[valueKey]);
}

function renderDistributionChart() {
  const grouped = d3.rollups(
    state.data.statements,
    (rows) => rows.length,
    (d) => {
      if (d.count >= 10) return "10+";
      if (d.count >= 5) return "5-9";
      return String(d.count);
    },
  );

  const order = ["1", "2", "3", "4", "5-9", "10+"];

  const data = grouped
    .map(([bucket, uniqueStatements]) => ({ bucket, uniqueStatements }))
    .sort((a, b) => order.indexOf(a.bucket) - order.indexOf(b.bucket));

  renderHorizontalBars("#distributionChart", data, {
    labelKey: "bucket",
    valueKey: "uniqueStatements",
    color: "#34d399",
    emptyMessage: "No distribution data found.",
  });
}

function renderScatterChart() {
  const container = d3.select("#scatterChart");
  container.selectAll("*").remove();

  if (!state.data) return;

  const data = getFilteredStatements({ ignoreTopN: true });

  if (!data.length) {
    container
      .append("div")
      .attr("class", "empty")
      .text("No scatterplot data found.");
    return;
  }

  const width = container.node().clientWidth;
  const height = Math.max(420, container.node().clientHeight || 420);
  const margin = { top: 24, right: 28, bottom: 50, left: 58 };

  const svg = container.append("svg").attr("viewBox", `0 0 ${width} ${height}`);

  const x = d3
    .scaleLinear()
    .domain(d3.extent(data, (d) => d.word_count))
    .nice()
    .range([margin.left, width - margin.right]);

  const y = d3
    .scaleLinear()
    .domain([0, d3.max(data, (d) => d.count) || 1])
    .nice()
    .range([height - margin.bottom, margin.top]);

  const r = d3
    .scaleSqrt()
    .domain([1, d3.max(data, (d) => d.count) || 1])
    .range([4, 18]);

  svg
    .append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x).ticks(6));

  svg
    .append("g")
    .attr("class", "axis")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y).ticks(6));

  svg
    .append("text")
    .attr("x", width / 2)
    .attr("y", height - 10)
    .attr("text-anchor", "middle")
    .attr("fill", "var(--muted)")
    .attr("font-size", 12)
    .text("Word count");

  svg
    .append("text")
    .attr("x", -height / 2)
    .attr("y", 18)
    .attr("transform", "rotate(-90)")
    .attr("text-anchor", "middle")
    .attr("fill", "var(--muted)")
    .attr("font-size", 12)
    .text("Frequency");

  svg
    .append("g")
    .selectAll("circle")
    .data(data)
    .join("circle")
    .attr("class", "clickable")
    .attr("cx", (d) => x(d.word_count))
    .attr("cy", (d) => y(d.count))
    .attr("r", (d) => r(d.count))
    .attr("fill", (d) => colors[d.comparison_type] || colors.unknown)
    .attr("opacity", 0.75)
    .on("click", (event, d) => openDrawer(d))
    .on("mousemove", (event, d) => {
      showTooltip(
        event,
        `
                <strong>${escapeHtml(d.comparison_statement)}</strong><br>
                Count: ${formatNumber(d.count)}<br>
                Words: ${formatNumber(d.word_count)}<br>
                Type: ${escapeHtml(d.comparison_type)}
              `,
      );
    })
    .on("mouseleave", hideTooltip);
}

function getWordRole(word) {
  if (word === "like" || word === "than") return "marker";
  if (state.data.than_modifiers.some((d) => d.than_modifier === word)) {
    return "modifier";
  }
  if (
    state.data.comparison_objects.some((d) =>
      String(d.comparison_object || "")
        .split(/\s+/)
        .includes(word),
    )
  ) {
    return "object";
  }
  if (commonWordsForView.has(word)) return "common";
  return "other";
}

function getWordColor(word, index) {
  const mode = d3.select("#wordColorMode").property("value");

  if (mode === "frequency") {
    const palette = ["#38bdf8", "#a78bfa", "#fbbf24", "#34d399", "#fb7185"];

    return palette[index % palette.length];
  }

  const role = getWordRole(word);

  return {
    marker: "#38bdf8",
    modifier: "#a78bfa",
    object: "#fbbf24",
    common: "#94a3b8",
    other: "#34d399",
  }[role];
}

function getVisibleWordData() {
  const minCount = +d3.select("#minWordCount").property("value") || 1;
  const maxWords = +d3.select("#maxWords").property("value") || 80;

  return state.data.words
    .filter((d) => d.word && d.count >= minCount)
    .slice(0, maxWords);
}

function renderWordCloud() {
  const container = d3.select("#wordCloud");
  container.selectAll("*").remove();

  const data = getVisibleWordData();

  if (!data.length) {
    container.append("div").attr("class", "empty").text("No word data found.");
    return;
  }

  const node = container.node();
  const width = node.clientWidth;
  const height = Math.max(520, node.clientHeight || 520);

  const svg = container
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet");

  const size = d3
    .scaleSqrt()
    .domain(d3.extent(data, (d) => d.count))
    .range([12, 58]);

  const columns = Math.ceil(Math.sqrt(data.length * (width / height)));
  const rows = Math.ceil(data.length / columns);

  const cellWidth = width / columns;
  const cellHeight = height / rows;

  const nodes = data.map((d, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);

    return {
      ...d,
      radius: size(d.count) * 0.72,
      targetX: column * cellWidth + cellWidth / 2,
      targetY: row * cellHeight + cellHeight / 2,
      x:
        column * cellWidth +
        cellWidth / 2 +
        (Math.random() - 0.5) * cellWidth * 0.5,
      y:
        row * cellHeight +
        cellHeight / 2 +
        (Math.random() - 0.5) * cellHeight * 0.5,
    };
  });

  const simulation = d3
    .forceSimulation(nodes)
    .force("x", d3.forceX((d) => d.targetX).strength(0.16))
    .force("y", d3.forceY((d) => d.targetY).strength(0.16))
    .force("charge", d3.forceManyBody().strength(2))
    .force(
      "collision",
      d3.forceCollide().radius((d) => d.radius + 8),
    )
    .stop();

  for (let i = 0; i < 360; i++) simulation.tick();

  svg
    .selectAll("text")
    .data(nodes)
    .join("text")
    .attr("class", "word")
    .attr("x", (d) => Math.max(8, Math.min(width - 8, d.x)))
    .attr("y", (d) => Math.max(16, Math.min(height - 16, d.y)))
    .attr("text-anchor", "middle")
    .attr("dominant-baseline", "middle")
    .attr("font-size", (d) => size(d.count))
    .attr("font-weight", 800)
    .attr("fill", (d, index) => getWordColor(d.word, index))
    .attr("opacity", 0.92)
    .text((d) => d.word)
    .on("click", (event, d) => setFilter("word", d.word))
    .on("mousemove", (event, d) => {
      showTooltip(
        event,
        `
          <strong>${escapeHtml(d.word)}</strong><br>
          Count: ${formatNumber(d.count)}<br>
          Role: ${escapeHtml(getWordRole(d.word))}<br>
          Click to filter
        `,
      );
    })
    .on("mouseleave", hideTooltip);
}

function renderWordBarChart() {
  renderHorizontalBars("#wordBarChart", getVisibleWordData().slice(0, 24), {
    labelKey: "word",
    valueKey: "count",
    color: "#34d399",
    emptyMessage: "No word data found.",
    filterType: "word",
    clickable: true,
  });
}

function renderTable() {
  const rows = getFilteredStatements();

  const tbody = d3.select("#statementTable");

  tbody
    .selectAll("tr")
    .data(rows, (d) => d.comparison_statement)
    .join("tr")
    .on("click", (event, d) => openDrawer(d))
    .html(
      (d) => `
              <td class="statement">${escapeHtml(d.comparison_statement)}</td>
              <td>${formatNumber(d.count)}</td>
              <td><span class="pill ${escapeHtml(d.comparison_type)}">${escapeHtml(
                d.comparison_type,
              )}</span></td>
              <td>${escapeHtml(d.pattern || "-")}</td>
              <td>${escapeHtml(d.comparison_object || "-")}</td>
              <td>${escapeHtml(d.than_modifier || "-")}</td>
              <td>${formatNumber(d.word_count)}</td>
              <td>${formatNumber(d.char_count)}</td>
            `,
    );
}

function renderPatternGroups() {
  renderGroupedList("#patternGroups", "pattern", {
    limitGroups: 12,
    limitItems: 6,
    onGroupClick: (pattern) => setFilter("pattern", pattern),
  });
}

function renderClusters() {
  renderGroupedList("#clusterByPattern", "pattern", {
    limitGroups: 18,
    limitItems: 8,
    onGroupClick: (pattern) => setFilter("pattern", pattern),
  });

  renderGroupedList("#clusterByObject", "comparison_object", {
    limitGroups: 18,
    limitItems: 8,
    onGroupClick: (object) => setFilter("object", object),
  });
}

function renderGroupedList(selector, key, options = {}) {
  const container = d3.select(selector);
  container.selectAll("*").remove();

  const groups = d3
    .rollups(
      state.data.statements.filter((d) => d[key]),
      (rows) => ({
        rows: rows.sort((a, b) => d3.descending(a.count, b.count)),
        total: d3.sum(rows, (d) => d.count),
      }),
      (d) => d[key],
    )
    .map(([name, value]) => ({ name, ...value }))
    .sort((a, b) => d3.descending(a.total, b.total))
    .slice(0, options.limitGroups || 15);

  if (!groups.length) {
    container.append("div").attr("class", "empty").text("No groups found.");
    return;
  }

  const details = container.selectAll("details").data(groups).join("details");

  details
    .append("summary")
    .html(
      (d) =>
        `${escapeHtml(d.name)} <span style="color: var(--muted)">(${formatNumber(
          d.total,
        )})</span>`,
    )
    .on("click", (event, d) => {
      if (event.altKey || event.metaKey || event.ctrlKey) {
        options.onGroupClick?.(d.name);
      }
    });

  const items = details.append("div").attr("class", "group-items");

  items
    .selectAll(".group-item")
    .data((d) => d.rows.slice(0, options.limitItems || 6))
    .join("div")
    .attr("class", "group-item clickable")
    .on("click", (event, d) => openDrawer(d))
    .html(
      (d) => `
              <span>${escapeHtml(d.comparison_statement)}</span>
              <strong>${formatNumber(d.count)}</strong>
            `,
    );
}

function openDrawer(row) {
  d3.select("#detailDrawer").classed("open", true);
  d3.select("#drawerTitle").text(row.comparison_statement || "Statement");

  const details = [
    ["Count", formatNumber(row.count)],
    ["Type", row.comparison_type],
    ["Pattern", row.pattern || "-"],
    ["Comparison object", row.comparison_object || "-"],
    ["Than modifier", row.than_modifier || "-"],
    ["First marker", row.first_marker || "-"],
    ["Word before marker", row.word_before_marker || "-"],
    ["Word after marker", row.word_after_marker || "-"],
    ["Word count", formatNumber(row.word_count)],
    ["Character count", formatNumber(row.char_count)],
  ];

  const container = d3.select("#drawerContent");
  container.html("");

  container
    .selectAll(".detail-row")
    .data(details)
    .join("div")
    .attr("class", "detail-row")
    .html(
      (d) => `
              <div class="detail-label">${escapeHtml(d[0])}</div>
              <div>${escapeHtml(d[1])}</div>
            `,
    );

  const actions = container.append("div").attr("class", "detail-grid");

  if (row.comparison_type) {
    actions
      .append("button")
      .text(`Filter type: ${row.comparison_type}`)
      .on("click", () => setFilter("type", row.comparison_type));
  }

  if (row.pattern) {
    actions
      .append("button")
      .text(`Filter pattern: ${row.pattern}`)
      .on("click", () => setFilter("pattern", row.pattern));
  }

  if (row.comparison_object) {
    actions
      .append("button")
      .text(`Filter object: ${row.comparison_object}`)
      .on("click", () => setFilter("object", row.comparison_object));
  }

  if (row.than_modifier) {
    actions
      .append("button")
      .text(`Filter modifier: ${row.than_modifier}`)
      .on("click", () => setFilter("modifier", row.than_modifier));
  }
}

function closeDrawer() {
  d3.select("#detailDrawer").classed("open", false);
}

function showTab(tabName) {
  d3.selectAll(".tab-button").classed("active", false);
  d3.selectAll(".tab-panel").classed("active", false);

  d3.select(`.tab-button[data-tab="${tabName}"]`).classed("active", true);
  d3.select(`#tab-${tabName}`).classed("active", true);

  if (!state.data) return;

  if (tabName === "overview") {
    renderTypeDonut();
    renderDistributionChart();
  }

  if (tabName === "statements") {
    renderStatementChart();
    renderScatterChart();
  }

  if (tabName === "patterns") {
    renderHorizontalBars("#patternChart", state.data.patterns.slice(0, 18), {
      labelKey: "pattern",
      valueKey: "count",
      color: "#38bdf8",
      emptyMessage: "No pattern data found.",
      filterType: "pattern",
    });

    renderHorizontalBars(
      "#modifierChart",
      state.data.than_modifiers.slice(0, 18),
      {
        labelKey: "than_modifier",
        valueKey: "count",
        color: "#a78bfa",
        emptyMessage: "No than-modifier data found.",
        filterType: "modifier",
      },
    );

    renderHorizontalBars(
      "#objectChart",
      state.data.comparison_objects.slice(0, 18),
      {
        labelKey: "comparison_object",
        valueKey: "count",
        color: "#fbbf24",
        emptyMessage: "No comparison-object data found.",
        filterType: "object",
      },
    );

    renderPatternGroups();
  }

  if (tabName === "words") {
    renderWordCloud();
    renderWordBarChart();
  }

  if (tabName === "clusters") {
    renderClusters();
  }

  if (tabName === "explorer") {
    renderTable();
  }
}

function truncate(text, maxLength) {
  text = String(text || "");
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function loadDefaultJson() {
  try {
    const response = await fetch("comparison_dashboard.json", {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    renderDashboard(data);
  } catch (error) {
    console.error("Could not load comparison_dashboard.json:", error);
  }
}

d3.select("#searchInput").on("input", updateFilteredViews);

d3.select("#typeFilter").on("change", function () {
  const value = this.value;
  state.filters.type = value === "all" ? null : value;
  updateFilteredViews();
});

d3.select("#topN").on("change", updateFilteredViews);
d3.select("#clearFiltersButton").on("click", clearAllFilters);
d3.select("#drawerClose").on("click", closeDrawer);
d3.select("#minWordCount").on("input", () => {
  renderWordCloud();
  renderWordBarChart();
});
d3.select("#maxWords").on("change", () => {
  renderWordCloud();
  renderWordBarChart();
});
d3.select("#wordColorMode").on("change", renderWordCloud);

d3.selectAll(".tab-button").on("click", function () {
  showTab(this.dataset.tab);
});

window.addEventListener("resize", () => {
  if (!state.data) return;
  renderDashboard(state.data);
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeDrawer();
  }

  if (event.key === "/" && document.activeElement.tagName !== "INPUT") {
    event.preventDefault();
    showTab("statements");
    d3.select("#searchInput").node().focus();
  }
});

loadDefaultJson();
