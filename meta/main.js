import scrollama from 'https://cdn.jsdelivr.net/npm/[email protected]/+esm';

console.log('main.js loaded');

let xScale, yScale;
let commitsRef = [];
let timeScale;
let commitProgress = 100;           
let commitMaxTime;                  
let filteredCommits = [];           

const REPO = document.querySelector('meta[name="repo"]')?.content || 'ppanchal-ucsd/portfolio';

async function loadData() {
  const data = await d3.csv('loc.csv', row => ({
    ...row,
    line: +row.line,
    depth: +row.depth,
    length: +row.length,
    datetime: new Date(row.datetime),
  }));
  return data;
}

function computeCommits(data) {
  const grouped = d3.groups(data, d => d.commit);
  const commits = grouped.map(([id, lines]) => {
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
    Object.defineProperty(commit, 'lines', { value: lines, enumerable: false });
    return commit;
  });
  return commits.sort((a,b)=>a.datetime - b.datetime);
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
  const width = container.node().clientWidth || 900;
  const height = 520;
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

  g.append('g').attr('transform', `translate(0,${innerH})`).attr('class', 'x-axis').call(d3.axisBottom(x));
  g.append('g').attr('class', 'y-axis').call(d3.axisLeft(y).ticks(13).tickFormat(d => `${String(d).padStart(2,'0')}:00`));

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
    .data(sorted, d => d.id)        
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

function updateScatterPlot(commits) {
  xScale = xScale.domain(d3.extent(commits, d => d.datetime));
  const svg = d3.select('#chart').select('svg');
  const g = svg.select('g'); 

  const xAxisGroup = g.select('g.x-axis');
  xAxisGroup.selectAll('*').remove();
  xAxisGroup.call(d3.axisBottom(xScale));

  const [minLines, maxLines] = d3.extent(commits, d => d.totalLines);
  const rScale = d3.scaleSqrt().domain([Math.max(1, minLines||1), maxLines||1]).range([3, 18]);

  const dots = g.select('g.dots');
  const sorted = d3.sort(commits, d => -d.totalLines);

  dots.selectAll('circle')
    .data(sorted, d => d.id)  
    .join(
      enter => enter.append('circle')
        .attr('cx', d => xScale(d.datetime))
        .attr('cy', d => yScale(d.hourFrac))
        .attr('r', 0)
        .attr('fill', 'steelblue')
        .attr('fill-opacity', 0.75)
        .call(sel => sel.transition().duration(300).attr('r', d => rScale(d.totalLines))),
      update => update.call(sel => sel.transition().duration(300)
        .attr('cx', d => xScale(d.datetime))
        .attr('cy', d => yScale(d.hourFrac))
        .attr('r', d => rScale(d.totalLines))),
      exit => exit.call(sel => sel.transition().duration(150).attr('r', 0).remove())
    );
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

function updateFileDisplay(filtered) {
  const lines = filtered.flatMap(d => d.lines);
  const files = d3.groups(lines, d => d.file)
    .map(([name, lines]) => {
      const byType = d3.rollup(lines, v => v.length, r => r.type);
      let best = null; for (const [k,v] of byType) if (!best || v > best[1]) best = [k,v];
      return { name, lines, type: best ? best[0] : 'Other' };
    })
    .sort((a,b) => b.lines.length - a.lines.length);

  const colors = d3.scaleOrdinal(d3.schemeTableau10);

  const filesContainer = d3.select('#files')
    .selectAll('div')
    .data(files, d => d.name)
    .join(
      enter => enter.append('div').call(div => {
        div.append('dt').append('code');
        div.append('dd');
      })
    )
    .attr('style', d => `--color: ${colors(d.type)}`);

  filesContainer.select('dt > code')
    .html(d => `${d.name}<small style="display:block; opacity:.7"> ${d.lines.length} lines</small>`);

  filesContainer.select('dd')
    .selectAll('div')
    .data(d => d.lines)
    .join('div')
    .attr('class', 'loc');
}

function bindSlider(commits) {
  const slider = document.getElementById('commit-progress');
  const timeEl = document.getElementById('commit-time');

  timeScale = d3.scaleTime()
    .domain([d3.min(commits, d => d.datetime), d3.max(commits, d => d.datetime)])
    .range([0, 100]);

  function onTimeSliderChange() {
    commitProgress = +slider.value;
    commitMaxTime = timeScale.invert(commitProgress);
    timeEl.textContent = commitMaxTime.toLocaleString(undefined, { dateStyle: 'long', timeStyle: 'short' });

    filteredCommits = commits.filter(d => d.datetime <= commitMaxTime);
    if (filteredCommits.length === 0) { filteredCommits = [commits[0]]; }

    updateScatterPlot(filteredCommits);
    updateFileDisplay(filteredCommits);
  }

  slider.addEventListener('input', onTimeSliderChange);
  slider.value = 100;
  onTimeSliderChange();
}

function buildScatterStory(commits) {
  d3.select('#scatter-story')
    .selectAll('.step')
    .data(commits)
    .join('div')
    .attr('class', 'step')
    .html((d, i) => `
      <strong>${d.datetime.toLocaleString(undefined, { dateStyle: 'full', timeStyle: 'short' })}</strong><br/>
      <a href="${d.url}" target="_blank" rel="noopener">${i > 0 ? 'Another commit' : 'First commit'}</a> editing ${d.totalLines} line(s).
    `);

  const scroller = scrollama();
  scroller
    .setup({ container: '#scrolly-1', step: '#scrolly-1 .step', offset: 0.6 })
    .onStepEnter(resp => {
      d3.selectAll('#scatter-story .step').classed('active', false);
      d3.select(resp.element).classed('active', true);

      const dt = resp.element.__data__.datetime;
      const pct = timeScale(dt);
      const slider = document.getElementById('commit-progress');
      slider.value = pct.toFixed(0);

      const event = new Event('input');
      slider.dispatchEvent(event);
    });
}

async function init() {
  const data = await loadData();
  const commits = computeCommits(data);
  commitsRef = commits;

  renderCommitInfo(data, commits);
  renderScatterPlot(commits);

  bindSlider(commits);

  buildScatterStory(commits);

  console.log('Loaded', { rows: data.length, commits: commits.length });
}
init();





