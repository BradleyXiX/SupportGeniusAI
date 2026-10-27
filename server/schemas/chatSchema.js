import { z } from "zod";

export const ChatPayloadSchema = z.object({
  body: z.object({
    message: z
      .string({
        required_error: "Field 'message' is required",
        invalid_type_error: "Field 'message' must be a string"
      })
      .trim()
      .min(1, "Message cannot be empty")
      .max(2000, "Message cannot exceed 2000 characters"),
    sessionId: z
      .string({
        invalid_type_error: "Field 'sessionId' must be a string"
      })
      .trim()
      .min(3, "Field 'sessionId' must be at least 3 characters")
      .max(64, "Field 'sessionId' cannot exceed 64 characters")
      .regex(/^[a-zA-Z0-9_-]+$/, "Field 'sessionId' can only contain alphanumeric characters, underscores, and hyphens")
      .optional()
  })
});
