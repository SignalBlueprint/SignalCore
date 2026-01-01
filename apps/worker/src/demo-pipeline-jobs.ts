/**
 * Demo jobs for demonstrating dependency chains
 * These jobs show how to create multi-step workflows using job dependencies
 */

import { type Job } from "@sb/jobs";

/**
 * Step 1: Fetch data
 */
export const fetchDataJob: Job = {
  id: "demo.pipeline.fetch",
  name: "Demo: Fetch Data",
  scheduleHint: "on-demand",
  run: async (ctx) => {
    ctx.logger.info("Starting data fetch...");

    const orgId = ctx.input?.orgId as string | undefined;
    ctx.logger.info(`Fetching data for org: ${orgId || 'default'}`);

    // Simulate fetching data
    await new Promise(resolve => setTimeout(resolve, 2000));

    ctx.logger.info("Data fetch completed successfully");

    // Publish event for monitoring
    await ctx.events.publish("demo.pipeline.fetch.completed", {
      orgId,
      recordCount: 100,
      timestamp: ctx.now.toISOString(),
    }, {
      sourceApp: "worker",
    });
  },
};

/**
 * Step 2: Process data (depends on fetch)
 */
export const processDataJob: Job = {
  id: "demo.pipeline.process",
  name: "Demo: Process Data",
  scheduleHint: "on-demand",
  run: async (ctx) => {
    ctx.logger.info("Starting data processing...");

    const orgId = ctx.input?.orgId as string | undefined;
    ctx.logger.info(`Processing data for org: ${orgId || 'default'}`);

    // Simulate processing
    await new Promise(resolve => setTimeout(resolve, 3000));

    ctx.logger.info("Data processing completed successfully");

    await ctx.events.publish("demo.pipeline.process.completed", {
      orgId,
      processedCount: 100,
      timestamp: ctx.now.toISOString(),
    }, {
      sourceApp: "worker",
    });
  },
};

/**
 * Step 3: Validate data (depends on process)
 */
export const validateDataJob: Job = {
  id: "demo.pipeline.validate",
  name: "Demo: Validate Data",
  scheduleHint: "on-demand",
  run: async (ctx) => {
    ctx.logger.info("Starting data validation...");

    const orgId = ctx.input?.orgId as string | undefined;
    ctx.logger.info(`Validating data for org: ${orgId || 'default'}`);

    // Simulate validation
    await new Promise(resolve => setTimeout(resolve, 1500));

    const validCount = 98;
    const invalidCount = 2;

    ctx.logger.info(`Validation complete: ${validCount} valid, ${invalidCount} invalid`);

    await ctx.events.publish("demo.pipeline.validate.completed", {
      orgId,
      validCount,
      invalidCount,
      timestamp: ctx.now.toISOString(),
    }, {
      sourceApp: "worker",
    });
  },
};

/**
 * Step 4: Generate report (depends on validate)
 */
export const generateReportJob: Job = {
  id: "demo.pipeline.report",
  name: "Demo: Generate Report",
  scheduleHint: "on-demand",
  run: async (ctx) => {
    ctx.logger.info("Starting report generation...");

    const orgId = ctx.input?.orgId as string | undefined;
    ctx.logger.info(`Generating report for org: ${orgId || 'default'}`);

    // Simulate report generation
    await new Promise(resolve => setTimeout(resolve, 2000));

    ctx.logger.info("Report generated successfully");

    await ctx.events.publish("demo.pipeline.report.completed", {
      orgId,
      reportUrl: `https://example.com/reports/${orgId}-${Date.now()}.pdf`,
      timestamp: ctx.now.toISOString(),
    }, {
      sourceApp: "worker",
    });
  },
};

/**
 * Parallel branch A: Export to CSV (depends on validate)
 */
export const exportCsvJob: Job = {
  id: "demo.pipeline.export.csv",
  name: "Demo: Export to CSV",
  scheduleHint: "on-demand",
  run: async (ctx) => {
    ctx.logger.info("Exporting data to CSV...");

    const orgId = ctx.input?.orgId as string | undefined;

    // Simulate CSV export
    await new Promise(resolve => setTimeout(resolve, 1000));

    ctx.logger.info("CSV export completed");

    await ctx.events.publish("demo.pipeline.export.csv.completed", {
      orgId,
      fileUrl: `https://example.com/exports/${orgId}.csv`,
      timestamp: ctx.now.toISOString(),
    }, {
      sourceApp: "worker",
    });
  },
};

/**
 * Parallel branch B: Export to JSON (depends on validate)
 */
export const exportJsonJob: Job = {
  id: "demo.pipeline.export.json",
  name: "Demo: Export to JSON",
  scheduleHint: "on-demand",
  run: async (ctx) => {
    ctx.logger.info("Exporting data to JSON...");

    const orgId = ctx.input?.orgId as string | undefined;

    // Simulate JSON export
    await new Promise(resolve => setTimeout(resolve, 800));

    ctx.logger.info("JSON export completed");

    await ctx.events.publish("demo.pipeline.export.json.completed", {
      orgId,
      fileUrl: `https://example.com/exports/${orgId}.json`,
      timestamp: ctx.now.toISOString(),
    }, {
      sourceApp: "worker",
    });
  },
};

/**
 * Final step: Send notification (depends on report, CSV, and JSON exports)
 */
export const sendNotificationJob: Job = {
  id: "demo.pipeline.notify",
  name: "Demo: Send Notification",
  scheduleHint: "on-demand",
  run: async (ctx) => {
    ctx.logger.info("Sending completion notification...");

    const orgId = ctx.input?.orgId as string | undefined;

    // Simulate sending notification
    await new Promise(resolve => setTimeout(resolve, 500));

    ctx.logger.info("Notification sent successfully");

    await ctx.events.publish("demo.pipeline.completed", {
      orgId,
      pipelineStatus: "success",
      timestamp: ctx.now.toISOString(),
    }, {
      sourceApp: "worker",
    });

    ctx.logger.info("🎉 Demo pipeline completed successfully!");
  },
};
