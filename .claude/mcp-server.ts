/**
 * npm add @modelcontextprotocol/sdk @mizchi/readability zod -D
 * {
  "mcpServers": {
    "local": {
      "command": "node",
      "args": [".claude/mcp-server.ts"]
    }
  }
}
*/
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { extract, toMarkdown } from "@mizchi/readability";

const server = new McpServer({
  name: "local-deno",
  version: "1.0.0",
});

server.tool(
  "read_url_content",
  "与えられたURLの本文抽出で取得し、Markdown形式で返します。",
  { url: z.string().describe("URL") },
  async ({ url }) => {
    const html = await fetch(url).then((res) => res.text());
    const extracted = extract(html, { charThreshold: 100 });
    if (extracted.root) {
      const parsed = toMarkdown(extracted.root);
      return { content: [{ type: "text", text: parsed }] };
    } else {
      return {
        content: [
          {
            type: "text",
            text: `No content found at the provided URL. Return full html.\n${html}`,
          },
        ],
      };
    }
  }
);

try {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Local MCP Server running on stdio");
} catch (error) {
  console.error("Error starting MCP server:", error);
  process.exit(1);
}
