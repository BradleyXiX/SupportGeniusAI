import { z } from "zod";
import { validationError } from "../utils/problemDetails.js";

export function validateRequest(schema) {
  return async (req, res, next) => {
    try {
      const dataToValidate = {};
      if (schema.shape.body) dataToValidate.body = req.body;
      if (schema.shape.query) dataToValidate.query = req.query;
      if (schema.shape.params) dataToValidate.params = req.params;

      const validated = await schema.parseAsync(dataToValidate);

      if (validated.body !== undefined) req.body = validated.body;
      if (validated.query !== undefined) req.query = validated.query;
      if (validated.params !== undefined) req.params = validated.params;

      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const invalidParams = error.issues.map((issue) => ({
          name: issue.path.filter((p) => p !== "body" && p !== "query" && p !== "params").join(".") || issue.path.join("."),
          reason: issue.message,
          code: issue.code
        }));

        const problem = validationError(req.originalUrl || req.url, invalidParams);
        return res.status(problem.status).json(problem.toJSON());
      }
      next(error);
    }
  };
}
