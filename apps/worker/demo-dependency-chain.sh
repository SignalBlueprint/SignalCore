#!/bin/bash

# Demo script for testing job dependency chains
# This creates a complete data pipeline workflow demonstrating dependency chains

set -e

echo "🚀 Worker Job Dependency Chain Demo"
echo "===================================="
echo ""
echo "This demo creates a data pipeline with the following structure:"
echo ""
echo "  fetch ──→ process ──→ validate ──┬──→ report ──┐"
echo "                                    ├──→ csv ─────┤"
echo "                                    └──→ json ────┴──→ notify"
echo ""
echo "Jobs will execute in dependency order automatically."
echo ""

# Check if queue manager is running
if ! pgrep -f "queue:start" > /dev/null; then
    echo "⚠️  Queue manager is not running!"
    echo "   Start it in another terminal with:"
    echo "   pnpm --filter worker dev -- queue:start"
    echo ""
    exit 1
fi

ORG_ID="${1:-demo-org}"
echo "Using organization: $ORG_ID"
echo ""

# Helper function to extract job ID from output
extract_job_id() {
    grep "Job ID:" | awk '{print $3}' | tr -d '\n'
}

echo "📥 Step 1: Enqueuing fetch job (no dependencies)..."
FETCH_ID=$(pnpm --filter worker dev -- queue:enqueue demo.pipeline.fetch \
    --org "$ORG_ID" \
    --priority high \
    2>&1 | extract_job_id)

if [ -z "$FETCH_ID" ]; then
    echo "❌ Failed to enqueue fetch job"
    exit 1
fi
echo "   ✓ Enqueued: $FETCH_ID"
echo ""

sleep 1

echo "⚙️  Step 2: Enqueuing process job (depends on fetch)..."
PROCESS_ID=$(pnpm --filter worker dev -- queue:enqueue demo.pipeline.process \
    --org "$ORG_ID" \
    --depends-on "$FETCH_ID" \
    --priority high \
    2>&1 | extract_job_id)

if [ -z "$PROCESS_ID" ]; then
    echo "❌ Failed to enqueue process job"
    exit 1
fi
echo "   ✓ Enqueued: $PROCESS_ID"
echo ""

sleep 1

echo "✅ Step 3: Enqueuing validate job (depends on process)..."
VALIDATE_ID=$(pnpm --filter worker dev -- queue:enqueue demo.pipeline.validate \
    --org "$ORG_ID" \
    --depends-on "$PROCESS_ID" \
    --priority normal \
    2>&1 | extract_job_id)

if [ -z "$VALIDATE_ID" ]; then
    echo "❌ Failed to enqueue validate job"
    exit 1
fi
echo "   ✓ Enqueued: $VALIDATE_ID"
echo ""

sleep 1

echo "📊 Step 4: Enqueuing report job (depends on validate)..."
REPORT_ID=$(pnpm --filter worker dev -- queue:enqueue demo.pipeline.report \
    --org "$ORG_ID" \
    --depends-on "$VALIDATE_ID" \
    --priority normal \
    2>&1 | extract_job_id)

if [ -z "$REPORT_ID" ]; then
    echo "❌ Failed to enqueue report job"
    exit 1
fi
echo "   ✓ Enqueued: $REPORT_ID"
echo ""

sleep 1

echo "📄 Step 5: Enqueuing CSV export (depends on validate)..."
CSV_ID=$(pnpm --filter worker dev -- queue:enqueue demo.pipeline.export.csv \
    --org "$ORG_ID" \
    --depends-on "$VALIDATE_ID" \
    --priority low \
    2>&1 | extract_job_id)

if [ -z "$CSV_ID" ]; then
    echo "❌ Failed to enqueue CSV export job"
    exit 1
fi
echo "   ✓ Enqueued: $CSV_ID"
echo ""

sleep 1

echo "📋 Step 6: Enqueuing JSON export (depends on validate)..."
JSON_ID=$(pnpm --filter worker dev -- queue:enqueue demo.pipeline.export.json \
    --org "$ORG_ID" \
    --depends-on "$VALIDATE_ID" \
    --priority low \
    2>&1 | extract_job_id)

if [ -z "$JSON_ID" ]; then
    echo "❌ Failed to enqueue JSON export job"
    exit 1
fi
echo "   ✓ Enqueued: $JSON_ID"
echo ""

sleep 1

echo "📧 Step 7: Enqueuing notification (depends on report, CSV, and JSON)..."
NOTIFY_ID=$(pnpm --filter worker dev -- queue:enqueue demo.pipeline.notify \
    --org "$ORG_ID" \
    --depends-on "$REPORT_ID,$CSV_ID,$JSON_ID" \
    --priority critical \
    2>&1 | extract_job_id)

if [ -z "$NOTIFY_ID" ]; then
    echo "❌ Failed to enqueue notification job"
    exit 1
fi
echo "   ✓ Enqueued: $NOTIFY_ID"
echo ""

echo "✅ All jobs enqueued successfully!"
echo ""
echo "Job IDs:"
echo "  Fetch:    $FETCH_ID"
echo "  Process:  $PROCESS_ID"
echo "  Validate: $VALIDATE_ID"
echo "  Report:   $REPORT_ID"
echo "  CSV:      $CSV_ID"
echo "  JSON:     $JSON_ID"
echo "  Notify:   $NOTIFY_ID"
echo ""
echo "📊 Monitor the pipeline with:"
echo "   pnpm --filter worker dev -- queue:list"
echo ""
echo "📈 View queue status with:"
echo "   pnpm --filter worker dev -- queue:status"
echo ""
echo "The jobs will execute in dependency order automatically."
echo "Watch the queue manager logs to see them run!"
