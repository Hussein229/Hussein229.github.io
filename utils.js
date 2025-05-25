const request = require('request');
const util = require('util');
const requestPromise = util.promisify(request);
const fs = require('fs');
const path = require('path');
const ssrfFilter = require('ssrf-req-filter');

async function fetchAndStoreReport(targetUrl) {
  const response = await requestPromise({
    uri: targetUrl,
    agent: ssrfFilter(targetUrl)
  });
  const content = response.body;

  const reportsDir = path.join(__dirname, 'reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir);
  }

  const filename = `report-${Date.now()}-${Math.random().toString(36).substr(2, 8)}.html`;
  const filePath = path.join(reportsDir, filename);

  fs.writeFileSync(filePath, content, 'utf8');

  return filePath;
}

module.exports = fetchAndStoreReport;
