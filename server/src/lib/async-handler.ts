import type { RequestHandler } from "express";

/**
 * Wraps an async route handler and forwards any thrown error to Express's
 * error pipeline, so individual handlers need no try/catch.
 */
export function asyncHandler(fn: RequestHandler): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
