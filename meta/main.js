
console.log('main.js loaded');

let xScale, yScale;
let commitsRef = [];

const REPO = document.querySelector('meta[name="repo"]')?.content || 'ppanchal-ucsd/portfolio';

async function loadData() {
  const data = await d3.csv('loc.csv', row => ({
    ...row,
    line: +row.line,
    depth: +row.depth,
    length: +row.length,
    datetime: new Date(row.datetime)
  }));
  return data;
}

function computeCommits(data) {
  const grouped = d3.groups(data, d => d.commit);
  return grouped.map(([id, lines]) => {
    const first = lines[0];
    const dt = new Date(first.datetime);

    const commit = {
      id,
      url: `https://github.com/${REPO}/commit/${id}`,
      author: first.author,
      datetime: dt,
      hourFrac: dt.getHours() + dt.getMinutes() / 60,
      totalLines: lines.length
    };

    Object.defineProperty(commit, 'lines', {
      value: lines, enumerable: false, writable: false, configurable: false
    });

    return commit;
  });
}

function renderCommitInfo(data, commits) {
  const dl = d3.select('#stats').append('dl').attr('class', 'stats');

  const files = new Set(data.map(d => d.file));
  const perFileLengths = d3.groups(data, d => d.file).map(([, rows]) => rows.length);

  dl.append('dt').html('Total <abbr title="Lines of code">LOC</abbr>');
  dl.append('dd').text(data.length);

  dl.append('dt').text('Total commits');
  dl.append('dd').text(commits.length);

  dl.append('dt').text('Files');
  dl.append('dd').text(files.size);

  dl.append('dt').text('Avg file length (lines)');
  dl.append('dd').text(Math.round(d3.mean(perFileLengths) ?? 0));

  dl.append('dt').text('Max file length (lines)');
  dl.append('dd').text(d3.max(perFileLengths) ?? 0);
}

function renderScatterPlot(commits) {
  const container = d3.select('#chart');
  const width = 900, height = 520;
  const margin = { top: 10, right: 20, bottom: 40, left: 60 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const svg = container.append('svg').attr('viewBox', `0 0 ${width} ${height}`);
  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

  const x = d3.scaleTime()
    .domain(d3.extent(commits, d => d.datetime))
    .range([0, innerW]).nice();

  const y = d3.scaleLinear()
    .domain([0, 24])
    .range([innerH, 0]);

  const r = d3.scaleSqrt()
    .domain(d3.extent(commits, d => Math.max(1, d.totalLines)))
    .range([3, 18]);

  xScale = x; yScale = y;

  g.append('g')
    .attr('class', 'gridlines')
    .call(d3.axisLeft(y).tickSize(-innerW).tickFormat(''));

  g.append('g').attr('transform', `translate(0,${innerH})`).call(d3.axisBottom(x));
  g.append('g').call(d3.axisLeft(y).ticks(13).tickFormat(d => `${String(d).padStart(2,'0')}:00`));

  g.append('text')
    .attr('x', innerW/2).attr('y', innerH + 30)
    .attr('text-anchor', 'middle').attr('font-size', 12).text('Date');

  g.append('text')
    .attr('x', -innerH/2).attr('y', -40)
    .attr('transform', 'rotate(-90)')
    .attr('text-anchor', 'middle').attr('font-size', 12).text('Hour of day');

  const tooltip = document.getElementById('commit-tooltip');
  const formatDate = d3.timeFormat('%a, %b %d %Y %I:%M %p');

  function showTooltip(event, d) {
    tooltip.hidden = false;
    tooltip.innerHTML = `
      <dt>Commit</dt>
      <dd><a href="${d.url}" target="_blank" rel="noopener noreferrer">${d.id}</a></dd>
      <dt>Author</dt><dd>${d.author ?? ''}</dd>
      <dt>Date</dt><dd>${formatDate(d.datetime)}</dd>
      <dt>Lines edited</dt><dd>${d.totalLines}</dd>
    `;
    tooltip.style.left = `${event.clientX + 12}px`;
    tooltip.style.top  = `${event.clientY + 12}px`;
  }
  function hideTooltip() { tooltip.hidden = true; }

  const sorted = d3.sort(commits, d => -d.totalLines);

  g.append('g').attr('class', 'dots')
    .selectAll('circle')
    .data(sorted)
    .join('circle')
    .attr('cx', d => x(d.datetime))
    .attr('cy', d => y(d.hourFrac))
    .attr('r', d => r(d.totalLines))
    .attr('fill', 'steelblue')
    .attr('fill-opacity', 0.75)
    .on('mouseenter', (e, d) => showTooltip(e, d))
    .on('mousemove', (e, d) => showTooltip(e, d))
    .on('mouseleave', hideTooltip);

  const brush = d3.brush().on('start brush end', brushed);
  g.call(brush);

  svg.selectAll('.dots, .overlay ~ *').raise();
}

function isCommitSelected(selection, commit) {
  if (!selection) return false;
  const [[x0, y0], [x1, y1]] = selection;
  const px = xScale(commit.datetime);
  const py = yScale(commit.hourFrac);
  return px >= x0 && px <= x1 && py >= y0 && py <= y1;
}

function renderSelectionCount(selection) {
  const selected = selection ? commitsRef.filter(d => isCommitSelected(selection, d)) : [];
  document.getElementById('selection-count').textContent =
    `${selected.length || 'No'} commits selected`;
  return selected;
}

function renderLanguageBreakdown(selection) {
  const selected = selection ? commitsRef.filter(d => isCommitSelected(selection, d)) : [];
  const el = document.getElementById('language-breakdown');
  if (selected.length === 0) { el.innerHTML = ''; return; }

  const lines = selected.flatMap(d => d.lines);
  const byType = d3.rollup(lines, v => v.length, d => d.type);

  el.innerHTML = '';
  for (const [lang, count] of byType) {
    const pct = d3.format('.1~%')(count / lines.length);
    el.innerHTML += `<dt>${lang}</dt><dd>${count} lines (${pct})</dd>`;
  }
}

function brushed(event) {
  const selection = event.selection;
  d3.selectAll('circle').classed('selected', d => isCommitSelected(selection, d));
  renderLanguageBreakdown(selection);
  renderSelectionCount(selection);
}

function buildScrolly(data, commits) {
  const svg = d3.select('#scroll-chart');
  if (svg.empty()) return; 

  const width = svg.node().clientWidth || 800;
  const height = svg.node().clientHeight || 500;
  svg.attr('viewBox', [0, 0, width, height]);

  const margin = { top: 30, right: 24, bottom: 40, left: 48 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

  const hourCounts = d3.rollups(
    commits,
    v => v.length,
    d => Math.floor(d.hourFrac)
  ).map(([h, count]) => ({ hour: +h, count }));

  for (let h = 0; h < 24; h++) {
    if (!hourCounts.some(d => d.hour === h)) hourCounts.push({ hour: h, count: 0 });
  }
  hourCounts.sort((a, b) => d3.ascending(a.hour, b.hour));

  const dominantLangByHour = new Map();
  for (let h = 0; h < 24; h++) {
    const linesAtHour = data.filter(r => new Date(r.datetime).getHours() === h);
    const byType = d3.rollup(linesAtHour, v => v.length, r => r.type);
    let best = null;
    for (const [k, v] of byType) {
      if (!best || v > best[1]) best = [k, v];
    }
    dominantLangByHour.set(h, best ? best[0] : 'Other');
  }

  const allTypes = Array.from(new Set(data.map(d => d.type))).filter(Boolean);
  const color = d3.scaleOrdinal().domain(allTypes.concat('Other')).range(d3.schemeTableau10);

  const x = d3.scaleBand()
    .domain(hourCounts.map(d => d.hour))
    .range([0, innerW])
    .padding(0.1);

  const y = d3.scaleLinear()
    .domain([0, d3.max(hourCounts, d => d.count) || 1])
    .nice()
    .range([innerH, 0]);

  g.append('g')
    .attr('transform', `translate(0,${innerH})`)
    .call(d3.axisBottom(x).tickValues([0,4,8,12,16,20,23]).tickFormat(d => `${String(d).padStart(2,'0')}:00`));

  g.append('g').call(d3.axisLeft(y).ticks(5));

  g.append('text')
    .attr('x', innerW / 2).attr('y', innerH + 32)
    .attr('text-anchor', 'middle').attr('font-size', 12)
    .text('Hour of day');

  g.append('text')
    .attr('x', -innerH / 2).attr('y', -36)
    .attr('transform', 'rotate(-90)')
    .attr('text-anchor', 'middle').attr('font-size', 12)
    .text('Commits');

  const bars = g.append('g').attr('class', 'bars')
    .selectAll('rect')
    .data(hourCounts, d => d.hour)
    .join('rect')
    .attr('x', d => x(d.hour))
    .attr('width', x.bandwidth())
    .attr('y', innerH)
    .attr('height', 0)
    .attr('fill', '#cfcfcf');

  bars.transition()
    .delay((d, i) => i * 10)
    .duration(600)
    .attr('y', d => y(d.count))
    .attr('height', d => innerH - y(d.count));

  const line = d3.line()
    .x(d => x(d.hour) + x.bandwidth() / 2)
    .y(d => y(d.count))
    .curve(d3.curveMonotoneX);

  const linePath = g.append('path')
    .attr('class', 'trend')
    .attr('d', line(hourCounts))
    .attr('fill', 'none')
    .attr('stroke', 'black')
    .attr('stroke-width', 2)
    .attr('opacity', 0);

  const maxHourDatum = hourCounts.reduce((a, b) => (a.count >= b.count ? a : b), hourCounts[0]);
  const annotation = g.append('g').attr('class', 'annotation').attr('opacity', 0);
  annotation.append('circle')
    .attr('cx', x(maxHourDatum.hour) + x.bandwidth() / 2)
    .attr('cy', y(maxHourDatum.count))
    .attr('r', 6)
    .attr('fill', 'goldenrod');
  annotation.append('text')
    .attr('x', x(maxHourDatum.hour) + x.bandwidth() / 2 + 8)
    .attr('y', y(maxHourDatum.count) - 8)
    .attr('font-weight', 600)
    .text(`Peak: ${String(maxHourDatum.hour).padStart(2,'0')}:00 (${maxHourDatum.count})`);

  const legend = svg.append('g').attr('class', 'legend').attr('transform', `translate(${width - 170},${margin.top})`).attr('opacity', 0);
  const legendItems = allTypes.slice(0, 6); 
  legendItems.forEach((t, i) => {
    const row = legend.append('g').attr('transform', `translate(0, ${i * 18})`);
    row.append('rect').attr('width', 12).attr('height', 12).attr('fill', color(t));
    row.append('text').attr('x', 16).attr('y', 10).attr('font-size', 12).text(t);
  });

  const steps = d3.selectAll('.step').nodes();

  function setActiveStep(activeIndex) {
    steps.forEach((s, i) => s.classList.toggle('active', i === activeIndex));

    if (activeIndex === 0) {
      legend.transition().duration(300).attr('opacity', 0);
      linePath.transition().duration(300).attr('opacity', 0);
      annotation.transition().duration(300).attr('opacity', 0);
      bars.transition().duration(600)
        .attr('fill', '#cfcfcf')
        .attr('opacity', 1)
        .attr('y', d => y(d.count))
        .attr('height', d => innerH - y(d.count));
    }

    if (activeIndex === 1) {
      bars.transition().duration(600)
        .attr('fill', d => color(dominantLangByHour.get(d.hour)))
        .attr('opacity', 1);
      legend.transition().duration(400).attr('opacity', 1);
      linePath.transition().duration(300).attr('opacity', 0);
      annotation.transition().duration(300).attr('opacity', 0);
    }

    if (activeIndex === 2) {
      bars.transition().duration(600).attr('opacity', 0.5);
      linePath.raise().transition().duration(600).attr('opacity', 1);
      legend.transition().duration(300).attr('opacity', 0.5);
      annotation.transition().duration(300).attr('opacity', 0);
    }

    if (activeIndex === 3) {
      bars.transition().duration(600)
        .attr('opacity', d => (d.hour === maxHourDatum.hour ? 1 : 0.2))
        .attr('fill', d => (d.hour === maxHourDatum.hour ? 'tomato' : bars.attr('fill')));
      linePath.transition().duration(300).attr('opacity', 0.3);
      legend.transition().duration(300).attr('opacity', 0.3);
      annotation.raise().transition().duration(500).attr('opacity', 1);
    }
  }

  const observer = new IntersectionObserver((entries) => {
    const mid = window.innerHeight * 0.5;
    const visible = entries
      .filter(e => e.isIntersecting)
      .map(e => ({ idx: steps.indexOf(e.target), dist: Math.abs(e.target.getBoundingClientRect().top - mid) }))
      .sort((a, b) => a.dist - b.dist);

    if (visible.length) setActiveStep(visible[0].idx);
  }, { root: null, threshold: 0.6 });

  steps.forEach(step => observer.observe(step));

  setActiveStep(0);
}
async function init() {
  const data = await loadData();
  const commits = computeCommits(data);
  commitsRef = commits;

  renderCommitInfo(data, commits);
  renderScatterPlot(commits);
  buildScrolly(data, commits); 

  console.log('Loaded', { rows: data.length, commits: commits.length });
}
init();



