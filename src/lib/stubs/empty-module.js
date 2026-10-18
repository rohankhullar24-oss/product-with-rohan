// Stand-in for Node-only packages that paper.js requires on the server
// (jsdom, canvas). Open Studio only runs paper in the browser, so this is
// never executed; it just lets the server bundle resolve.
module.exports = {};
