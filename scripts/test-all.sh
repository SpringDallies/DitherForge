#!/usr/bin/env bash
# Pre-merge verification suite for DitherForge
set -e

echo "=================================================================="
echo "          DITHERFORGE COMPREHENSIVE PRE-MERGE VERIFICATION        "
echo "=================================================================="

echo ""
echo ">>> [1/3] Engine Integrity Verification..."
npm run engine:verify || {
  echo "❌ FAILED: engine:verify exited with code $?"
  exit 1
}

echo ""
echo ">>> [2/3] Feature Inventory Verification..."
npm run inventory:check || {
  echo "❌ FAILED: inventory:check exited with code $?"
  exit 1
}

echo ""
echo ">>> [3/3] Golden Test Suite..."
npm run test:golden || {
  echo "❌ FAILED: test:golden exited with code $?"
  exit 1
}

echo ""
echo "=================================================================="
echo "✅ PRE-MERGE VERIFICATION PASSED: All 3 suites succeeded cleanly."
echo "=================================================================="
exit 0
