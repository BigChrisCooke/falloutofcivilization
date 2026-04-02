Treat @AGENTS.md the same way you would CLAUDE.md

## Work Tracking with Telora

This project uses Telora for product management and issue tracking via MCP tools. The `telora-products` MCP server provides tools for managing products, strategies, deliveries, issues, OKRs, playbooks, factory blueprints, and agent orchestration. Use `telora_discover` to explore available tools and capabilities.

### Issue Workflow

**Statuses**: To Do -> In Progress -> In Review/Blocked -> Done

**Issue types**: Context Group (groups related tasks), Task, Bug

**Starting work**: List issues with `telora_product_issue_list`, pick one in "To Do", move it to "In Progress" with `telora_product_issue_update`.

**Completing work**: Move the issue to "Done". If you discover new work, create issues with `telora_product_issue_create`.

### Planning Hierarchy

Telora has four levels. Most products need only ONE strategy. Use the minimum depth that captures the work.

- **Strategy** = the ENTIRE product or a major multi-month capability. A small-to-medium project is ONE strategy. You almost never need more than one. If you're tempted to create multiple strategies, you're probably thinking of deliveries.
- **Delivery** = a shippable phase or major component within a strategy. "Build the parser", "Add graphing support", "Polish the UI" are deliveries within a single strategy, NOT separate strategies.
- **Context Group** = optional grouping within a delivery. Use when multiple tasks share context (relevant files, architectural notes). A CG earns its existence by carrying context, not just grouping.
- **Task** = one discrete implementable unit. Completable in a focused session, touching a bounded set of files.

**Common mistake**: Creating multiple strategies for what should be deliveries under one strategy. A strategy is NOT a feature -- it is the whole product effort or a major capability area. For a typical project, create ONE strategy and put features as deliveries under it.

### Starting Telora

When the user asks to "start telora" or "start the daemon", use the `telora_connector_start` MCP tool. It generates `daemon.json`, resolves the product ID, and starts the daemon automatically. If no product exists yet, it will auto-create one from the repo directory name. Do NOT run `telora-daemon start` directly -- always use the MCP tool so credentials and product config are set correctly.

If a product was just auto-created (check the `autoCreatedProduct` field in the response), tell the user and offer to help fill out the product vision, description, target audience, and other details through conversation. Use `telora_product` with action `update` to save what you discuss.