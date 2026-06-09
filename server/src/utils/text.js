'use strict';

// escape input for use as a literal inside a $regex query (avoids ReDoS)
function escapeRegex(input) {
  return String(input).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = { escapeRegex };
