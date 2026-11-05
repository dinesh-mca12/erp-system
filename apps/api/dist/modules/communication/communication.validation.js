import { z } from "zod";
export const createMessageSchema = z.object({
    channelId: z.string().optional(),
    receiverId: z.string().optional(),
    text: z.string().min(1, "Message content is required."),
    attachments: z.array(z.object({
        name: z.string(),
        url: z.string(),
        type: z.string()
    })).optional()
});
export const updateMessageSchema = z.object({
    text: z.string().min(1, "Message content is required.")
});
export const createChannelSchema = z.object({
    name: z.string().min(1, "Channel name is required."),
    type: z.enum(["announcement", "department", "team"]).default("team"),
    department: z.string().optional(),
    isPrivate: z.boolean().default(false),
    members: z.array(z.string()).default([])
});
//# sourceMappingURL=communication.validation.js.map