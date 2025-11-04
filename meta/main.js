console.log('main.js loaded');

let xScale, yScale;    
let commitsRef = [];    

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
    return {
      id,
      author: first.author,
      datetime: dt,
      hourFrac: dt.getHours() + dt.getMinutes() / 60,
      totalLines: lines.length,
      lines
    };
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

  g.append('text').attr('x', innerW/2).attr('y', innerH + 30).attr('text-anchor', 'middle').attr('font-size', 12).text('Date');
  g.append('text').attr('x', -innerH/2).attr('y', -40).attr('transform', 'rotate(-90)').attr('text-anchor', 'middle').attr('font-size', 12).text('Hour of day');

  const tooltip = document.getElementById('commit-tooltip');
  const formatDate = d3.timeFormat('%a, %b %d %Y %I:%M %p');

  function showTooltip(event, d) {
    tooltip.hidden = false;
    tooltip.innerHTML = `
      <dt>Commit</dt><dd>${d.id}</dd>
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

async function init() {
  const data = await loadData();
  const commits = computeCommits(data);
  commitsRef = commits;

  renderCommitInfo(data, commits);
  renderScatterPlot(commits);

  console.log('Loaded', { rows: data.length, commits: commits.length });
}
init();

