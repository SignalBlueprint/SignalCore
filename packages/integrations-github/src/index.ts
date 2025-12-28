/**
 * @sb/integrations-github
 * GitHub integration for syncing tasks to GitHub Issues
 */

import { getEnv } from "@sb/config";

const GITHUB_API_BASE = "https://api.github.com";

/**
 * Get GitHub token from environment
 */
function getGitHubToken(): string {
  const token = getEnv("GITHUB_TOKEN", { required: true });
  if (!token) {
    throw new Error(
      "GITHUB_TOKEN environment variable is required for GitHub integration. " +
      "Set it in your .env file or environment."
    );
  }
  return token;
}

/**
 * Make authenticated GitHub API request
 */
async function githubRequest(
  method: string,
  path: string,
  body?: any
): Promise<any> {
  const token = getGitHubToken();
  const url = `${GITHUB_API_BASE}${path}`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "SignalBlueprint/1.0",
  };

  if (body) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `GitHub API error (${response.status}): ${errorText || response.statusText}`
    );
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return null;
  }

  return response.json();
}

/**
 * Create a GitHub issue
 */
export interface CreateIssueOptions {
  repo: string; // Format: owner/repo
  title: string;
  body?: string;
  labels?: string[];
}

export interface GitHubIssue {
  number: number;
  title: string;
  body: string;
  state: "open" | "closed";
  html_url: string;
  labels: Array<{ name: string }>;
}

export async function createIssue(
  options: CreateIssueOptions
): Promise<GitHubIssue> {
  const { repo, title, body, labels } = options;

  if (!repo || !repo.includes("/")) {
    throw new Error("Repository must be in format 'owner/repo'");
  }

  const payload: any = {
    title,
  };

  if (body) {
    payload.body = body;
  }

  if (labels && labels.length > 0) {
    payload.labels = labels;
  }

  return githubRequest("POST", `/repos/${repo}/issues`, payload);
}

/**
 * Update a GitHub issue
 */
export interface UpdateIssueOptions {
  repo: string; // Format: owner/repo
  issueNumber: number;
  title?: string;
  body?: string;
  labels?: string[];
  state?: "open" | "closed";
}

export async function updateIssue(
  options: UpdateIssueOptions
): Promise<GitHubIssue> {
  const { repo, issueNumber, title, body, labels, state } = options;

  if (!repo || !repo.includes("/")) {
    throw new Error("Repository must be in format 'owner/repo'");
  }

  const payload: any = {};

  if (title !== undefined) {
    payload.title = title;
  }

  if (body !== undefined) {
    payload.body = body;
  }

  if (labels !== undefined) {
    payload.labels = labels;
  }

  if (state !== undefined) {
    payload.state = state;
  }

  return githubRequest(
    "PATCH",
    `/repos/${repo}/issues/${issueNumber}`,
    payload
  );
}

/**
 * Get a GitHub issue
 */
export async function getIssue(
  repo: string,
  issueNumber: number
): Promise<GitHubIssue> {
  if (!repo || !repo.includes("/")) {
    throw new Error("Repository must be in format 'owner/repo'");
  }

  return githubRequest("GET", `/repos/${repo}/issues/${issueNumber}`);
}

/**
 * Check if GitHub integration is configured
 */
export function isGitHubConfigured(): boolean {
  try {
    getGitHubToken();
    return true;
  } catch {
    return false;
  }
}

