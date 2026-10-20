/**
 * AI Proxy Route Handler (Modularized)
 * 
 * This file delegates all AI proxy routing, provider failover, billing, 
 * and model handling to modular services and handlers in `./proxy/`.
 * 
 * - Claude/Anthropic: `./proxy/handlers/claude`
 * - OpenAI/Codex:     `./proxy/handlers/openai`
 * - Responses API:    `./proxy/handlers/responses`
 * - Models catalog:   `./proxy/handlers/models`
 * - Core services:    `./proxy/services/`
 */

export * from "./proxy";
export { default } from "./proxy";
