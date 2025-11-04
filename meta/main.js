console.log('✅ main.js loaded');

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

  const numFiles = new Set(data.map(d => d.file)).size;
  const fileGroups = d3.groups(data, d => d.file);
  const fileLengths = fileGroups.map(([, rows]) => rows.length);

  dl.append('dt').html('Total <abbr title="Lines of code">LOC</abbr>');
  dl.append('dd').text(data.length);
  dl.append('dt').text('Total commits');
  dl.append('dd').text(commits.length);
  dl.append('dt').text('Files');
  dl.append('dd').text(numFiles);
  dl.append('dt').text('Avg file length (lines)');
  dl.append('dd').text(Math.round(d3.mean(fileLengths) ?? 0));
  dl.append('dt').text('Max file length (lines)');
  dl.append('dd').text(d3.max(fileLengths) ?? 0);
}

function renderScatterPlot(commits) {
  const container = d3.select('#chart');
  const width = 900;
  const height = 520;
  const margin = { top: 10, right: 20, bottom: 40, left: 60 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const svg = container.append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`);

  const g = svg.append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  const x = d3.scaleTime()
    .domain(d3.extent(commits, d => d.datetime))
    .range([0, innerWidth])
    .nice();

  const y = d3.scaleLinear()
    .domain([0, 24])
    .range([innerHeight, 0]);

  const r = d3.scaleSqrt()
    .domain(d3.extent(commits, d => Math.max(1, d.totalLines)))
    .range([3, 18]);

  g.append('g')
    .attr('class', 'gridlines')
    .call(d3.axisLeft(y).tickSize(-innerWidth).tickFormat(''))
    .selectAll('line')
    .attr('stroke-opacity', 0.2);

  g.append('g')
    .attr('transform', `translate(0,${innerHeight})`)
    .call(d3.axisBottom(x));
  g.append('g').call(d3.axisLeft(y).ticks(13).tickFormat(d => `${String(d).padStart(2,'0')}:00`));

  g.append('text')
    .attr('x', innerWidth / 2)
    .attr('y', innerHeight + 32)
    .attr('text-anchor', 'middle')
    .attr('font-size', 12)
    .text('Date');

  g.append('text')
    .attr('x', -innerHeight / 2)
    .attr('y', -40)
    .attr('transform', 'rotate(-90)')
    .attr('text-anchor', 'middle')
    .attr('font-size', 12)
    .text('Hour of day');

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
    tooltip.style.position = 'fixed';
    tooltip.style.left = `${event.clientX + 12}px`;
    tooltip.style.top = `${event.clientY + 12}px`;
    tooltip.style.background = 'white';
    tooltip.style.border = '1px solid #ddd';
    tooltip.style.boxShadow = '0 4px 10px rgba(0,0,0,0.1)';
    tooltip.style.padding = '8px 10px';
    tooltip.style.borderRadius = '8px';
    tooltip.style.fontSize = '12px';
  }

  function hideTooltip() {
    tooltip.hidden = true;
  }

  const sorted = d3.sort(commits, d => -d.totalLines);

  g.append('g')
    .attr('class', 'dots')
    .selectAll('circle')
    .data(sorted)
    .join('circle')
    .attr('cx', d => x(d.datetime))
    .attr('cy', d => y(d.hourFrac))
    .attr('r', d => r(d.totalLines))
    .attr('fill', 'steelblue')
    .attr('fill-opacity', 0.75)
    .on('mouseenter', (event, d) => showTooltip(event, d))
    .on('mousemove', (event, d) => showTooltip(event, d))
    .on('mouseleave', hideTooltip);
}

async function init() {
  const data = await loadData();
  const commits = computeCommits(data);
  renderCommitInfo(data, commits);
  renderScatterPlot(commits);
  console.log('Loaded', { rows: data.length, commits: commits.length });
}

init();
