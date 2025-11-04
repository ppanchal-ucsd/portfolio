import * as d3 from 'https://cdn.jsdelivr.net/npm/[email protected]/+esm';

async function loadData() {
  const data = await d3.csv('loc.csv', row => ({
    ...row,
    line: Number(row.line),
    depth: Number(row.depth),
    length: Number(row.length),
    datetime: new Date(row.datetime),
  }));
  return data;
}

function computeCommits(data) {
  const grouped = d3.groups(data, d => d.commit);
  return grouped.map(([id, lines]) => {
    const first = lines[0];
    const obj = {
      id,
      author: first.author,
      datetime: new Date(first.datetime),
      hourFrac: first.datetime ? new Date(first.datetime).getHours() + new Date(first.datetime).getMinutes()/60 : 0,
      totalLines: lines.length,
      lines
    };
    return obj;
  });
}

function renderCommitInfo(data, commits) {
  const dl = d3.select('#stats').append('dl').attr('class', 'stats');
  const files = new Set(data.map(d => d.file));
  const fileGroups = d3.groups(data, d => d.file);
  const fileLengths = fileGroups.map(([, rows]) => rows.length);
  const avgFileLen = d3.mean(fileLengths) ?? 0;
  const maxFileLen = d3.max(fileLengths) ?? 0;

  dl.append('dt').html('Total <abbr title="Lines of code">LOC</abbr>');
  dl.append('dd').text(data.length);
  dl.append('dt').text('Total commits');
  dl.append('dd').text(commits.length);
  dl.append('dt').text('Files');
  dl.append('dd').text(files.size);
  dl.append('dt').text('Avg file length (lines)');
  dl.append('dd').text(Math.round(avgFileLen));
  dl.append('dt').text('Max file length (lines)');
  dl.append('dd').text(maxFileLen);
}

async function init() {
  const data = await loadData();
  const commits = computeCommits(data);
  renderCommitInfo(data, commits);
  console.log({ data, commits });
}

init();
